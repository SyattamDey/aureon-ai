import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

export const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
export const SUPPORTED_FALLBACK_MODELS = ['gemini-3.1-flash-lite'] as const;

// Exponential backoff delays: 1st retry = 2s, 2nd retry = 4s, 3rd retry = 8s
const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;
const PER_ATTEMPT_TIMEOUT_MS = 25000;
const MAX_RETRY_AFTER_WAIT_MS = 30000;
const MODEL_LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const DAILY_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

export const SERVICE_UNAVAILABLE_MESSAGE =
  'AI service temporarily unavailable. Please try again shortly.';

let cachedAvailableModels: { models: Set<string>; fetchedAt: number } | null = null;
const modelCooldownUntil = new Map<string, number>();

function sanitizeForLog(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/re_[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|x-goog-api-key|token)\s*[:=]\s*["']?[^\s"',}]+/gi, '$1=[REDACTED]');
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getHeaderValue(headers: unknown, headerName: string): string | null {
  if (!headers) return null;
  const target = headerName.toLowerCase();

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(headerName) ?? (headers as Headers).get(target);
  }

  if (typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() === target && v !== undefined && v !== null) {
        return Array.isArray(v) ? String(v[0]) : String(v);
      }
    }
  }
  return null;
}

function extractRetryInfoSeconds(rawMessage: string): number | null {
  const match = rawMessage.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (match) {
    const secs = Number(match[1]);
    return Number.isFinite(secs) ? secs : null;
  }
  return null;
}

function parseRetryAfterMs(error: unknown, rawMessage: string): number | null {
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    const responseObj = errObj.response as Record<string, unknown> | undefined;

    const rawHeader =
      getHeaderValue(errObj.headers, 'retry-after') ||
      getHeaderValue(responseObj?.headers, 'retry-after');

    if (rawHeader) {
      const trimmed = rawHeader.trim();
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const seconds = Number(trimmed);
        if (Number.isFinite(seconds) && seconds >= 0) {
          return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_WAIT_MS);
        }
      }

      const parsedDate = Date.parse(trimmed);
      if (!Number.isNaN(parsedDate)) {
        const delta = parsedDate - Date.now();
        if (delta > 0) {
          return Math.min(delta, MAX_RETRY_AFTER_WAIT_MS);
        }
      }
    }
  }

  const retryInfoSecs = extractRetryInfoSeconds(rawMessage);
  if (retryInfoSecs !== null && retryInfoSecs <= 30) {
    return Math.round(retryInfoSecs * 1000);
  }

  return null;
}

function extractHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as Record<string, unknown>;
  const candidates = [
    e.status,
    e.statusCode,
    e.code,
    (e.response as Record<string, unknown> | undefined)?.status,
    (e.error as Record<string, unknown> | undefined)?.code,
  ];

  for (const c of candidates) {
    const num = Number(c);
    if (Number.isInteger(num) && num >= 100 && num <= 599) {
      return num;
    }
  }

  const msg = e instanceof Error ? e.message : String(error);
  const match = msg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  if (match) {
    return Number(match[1]);
  }
  return null;
}

interface ClassifiedError {
  status: number | null;
  retryable: boolean;
  shouldFallbackImmediately: boolean;
  isDailyQuotaExhausted: boolean;
  isAuthError: boolean;
  isMissingKey: boolean;
  retryAfterMs: number | null;
  rawMessage: string;
}

function classifyGeminiError(error: unknown): ClassifiedError {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (rawMessage === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      retryable: false,
      shouldFallbackImmediately: false,
      isDailyQuotaExhausted: false,
      isAuthError: false,
      isMissingKey: true,
      retryAfterMs: null,
      rawMessage,
    };
  }

  const status = extractHttpStatus(error);
  const retryAfterMs = parseRetryAfterMs(error, rawMessage);
  const retryInfoSecs = extractRetryInfoSeconds(rawMessage);
  const upper = rawMessage.toUpperCase();

  const isAuthError =
    status === 401 ||
    status === 403 ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('API_KEY_INVALID');

  if (isAuthError) {
    return {
      status: 403,
      retryable: false,
      shouldFallbackImmediately: false,
      isDailyQuotaExhausted: false,
      isAuthError: true,
      isMissingKey: false,
      retryAfterMs: null,
      rawMessage,
    };
  }

  const isModelNotFound = status === 404 || upper.includes('NOT_FOUND');
  if (isModelNotFound) {
    return {
      status: 404,
      retryable: false,
      shouldFallbackImmediately: true,
      isDailyQuotaExhausted: false,
      isAuthError: false,
      isMissingKey: false,
      retryAfterMs: null,
      rawMessage,
    };
  }

  const isInvalidInput = status === 400 && !upper.includes('TIMEOUT');
  if (isInvalidInput) {
    return {
      status: 400,
      retryable: false,
      shouldFallbackImmediately: false,
      isDailyQuotaExhausted: false,
      isAuthError: false,
      isMissingKey: false,
      retryAfterMs: null,
      rawMessage,
    };
  }

  // Per-day free-tier model quota cannot succeed on a 2s/4s/8s retry; switch to fallback immediately
  const isDailyQuotaExhausted =
    (status === 429 || upper.includes('RESOURCE_EXHAUSTED')) &&
    (upper.includes('PERDAY') ||
      upper.includes('REQUESTS PER DAY') ||
      (retryInfoSecs !== null && retryInfoSecs > 60));

  if (isDailyQuotaExhausted) {
    return {
      status: 429,
      retryable: false,
      shouldFallbackImmediately: true,
      isDailyQuotaExhausted: true,
      isAuthError: false,
      isMissingKey: false,
      retryAfterMs: null,
      rawMessage,
    };
  }

  const isTimeoutOrNetwork =
    upper.includes('TIMEOUT') ||
    upper.includes('ABORT') ||
    upper.includes('ETIMEDOUT') ||
    upper.includes('ECONNRESET') ||
    upper.includes('ECONNREFUSED') ||
    upper.includes('EAI_AGAIN') ||
    upper.includes('ENOTFOUND') ||
    upper.includes('FETCH FAILED') ||
    upper.includes('NETWORK') ||
    upper.includes('EMPTY_RESPONSE');

  const isTemporaryHttp =
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('INTERNAL');

  const retryable = isTemporaryHttp || isTimeoutOrNetwork;

  return {
    status,
    retryable,
    shouldFallbackImmediately: false,
    isDailyQuotaExhausted: false,
    isAuthError: false,
    isMissingKey: false,
    retryAfterMs,
    rawMessage,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`REQUEST_TIMEOUT after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getAvailableSupportedModels(ai: GoogleGenAI): Promise<string[]> {
  const candidates = [PRIMARY_GEMINI_MODEL, ...SUPPORTED_FALLBACK_MODELS];
  let matched: string[] = [...candidates];

  if (
    cachedAvailableModels &&
    Date.now() - cachedAvailableModels.fetchedAt < MODEL_LIST_CACHE_TTL_MS
  ) {
    const fromCache = candidates.filter((m) => cachedAvailableModels!.models.has(m));
    if (fromCache.length > 0) matched = fromCache;
  } else {
    try {
      const pager = await withTimeout(ai.models.list(), 5000);
      const availableSet = new Set<string>();
      for await (const model of pager) {
        if (model.name) {
          availableSet.add(model.name.replace(/^models\//, ''));
        }
      }
      cachedAvailableModels = { models: availableSet, fetchedAt: Date.now() };
      const fromList = candidates.filter((m) => availableSet.has(m));
      if (fromList.length > 0) matched = fromList;
    } catch (err) {
      console.warn(
        `[AUREON AI] Could not refresh model catalog; using verified allowlist. Detail: ${sanitizeForLog(
          err instanceof Error ? err.message : String(err)
        )}`
      );
    }
  }

  // Prefer models not currently in daily-quota cooldown
  const now = Date.now();
  const ready = matched.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= now);
  return ready.length > 0 ? ready : matched;
}

export interface ReliableGeminiCallOptions {
  operationName: string;
  contents: GenerateContentParameters['contents'];
  config?: GenerateContentParameters['config'];
}

export interface ReliableGeminiCallResult {
  response: GenerateContentResponse;
  modelUsed: string;
  attempts: number;
  usedFallback: boolean;
}

export async function generateContentWithRetry(
  options: ReliableGeminiCallOptions
): Promise<ReliableGeminiCallResult> {
  const ai = getGeminiClient();
  const modelsToTry = await getAvailableSupportedModels(ai);

  let totalAttempts = 0;
  let lastClassified: ClassifiedError | null = null;

  for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
    const model = modelsToTry[modelIdx];
    const isFallback = modelIdx > 0 || model !== PRIMARY_GEMINI_MODEL;
    const maxRetriesForModel = RETRY_DELAYS_MS.length; // 3 retries (2s, 4s, 8s)

    for (let attempt = 0; attempt <= maxRetriesForModel; attempt++) {
      totalAttempts += 1;

      try {
        // Exact original contents and config are preserved on every attempt & fallback
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config,
          }),
          PER_ATTEMPT_TIMEOUT_MS
        );

        const text = (response.text ?? '').trim();
        if (!text) {
          throw new Error('EMPTY_RESPONSE_FROM_GEMINI');
        }

        if (totalAttempts > 1 || isFallback) {
          console.info(
            `[AUREON AI] ${options.operationName} succeeded on attempt ${totalAttempts} using model=${model} (fallback=${isFallback}).`
          );
        }

        return {
          response,
          modelUsed: model,
          attempts: totalAttempts,
          usedFallback: isFallback,
        };
      } catch (err) {
        const classified = classifyGeminiError(err);
        lastClassified = classified;

        if (classified.isDailyQuotaExhausted) {
          modelCooldownUntil.set(model, Date.now() + DAILY_QUOTA_COOLDOWN_MS);
          console.warn(
            `[AUREON AI] ${options.operationName}: daily free-tier quota exhausted on model=${model}; switching immediately to next supported model.`
          );
          break;
        }

        if (classified.isMissingKey || classified.isAuthError) {
          throw err;
        }

        if (classified.shouldFallbackImmediately) {
          console.warn(
            `[AUREON AI] ${options.operationName}: model=${model} returned ${classified.status ?? '404'}; switching to fallback model.`
          );
          break;
        }

        if (!classified.retryable) {
          throw err;
        }

        console.warn(
          `[AUREON AI] ${options.operationName} temporary error (model=${model}, attempt=${
            attempt + 1
          }/${maxRetriesForModel + 1}, status=${classified.status ?? 'N/A'}): ${sanitizeForLog(
            classified.rawMessage.slice(0, 220)
          )}`
        );

        if (attempt < maxRetriesForModel) {
          const baseDelay = RETRY_DELAYS_MS[attempt];
          const waitMs =
            classified.retryAfterMs !== null
              ? Math.max(baseDelay, classified.retryAfterMs)
              : baseDelay;
          console.info(
            `[AUREON AI] Retrying ${options.operationName} (model=${model}) in ${waitMs}ms (retry ${
              attempt + 1
            }/${maxRetriesForModel}${
              classified.retryAfterMs !== null ? `, Retry-After=${classified.retryAfterMs}ms` : ''
            }).`
          );
          await sleep(waitMs);
        }
      }
    }

    if (modelIdx < modelsToTry.length - 1) {
      console.warn(
        `[AUREON AI] Switching ${options.operationName} to supported fallback model=${modelsToTry[modelIdx + 1]}.`
      );
    }
  }

  console.error(
    `[AUREON AI] All model attempts failed for ${options.operationName} (lastStatus=${
      lastClassified?.status ?? 503
    }): ${sanitizeForLog((lastClassified?.rawMessage || 'Unknown failure').slice(0, 300))}`
  );

  const isQuotaExhausted = Boolean(lastClassified?.isDailyQuotaExhausted);
  const finalError = new Error(
    isQuotaExhausted
      ? 'AI service quota limit reached for the free tier. Please try again later or attach a billing-enabled GEMINI_API_KEY in Settings > Secrets.'
      : SERVICE_UNAVAILABLE_MESSAGE
  ) as Error & {
    isServiceUnavailable?: boolean;
    isQuotaExhausted?: boolean;
    lastStatus?: number | null;
  };
  finalError.isServiceUnavailable = !isQuotaExhausted;
  finalError.isQuotaExhausted = isQuotaExhausted;
  finalError.lastStatus = lastClassified?.status ?? 503;
  throw finalError;
}

export function formatGeminiErrorResponse(error: unknown): { status: number; message: string } {
  const errObj = error as {
    isServiceUnavailable?: boolean;
    isQuotaExhausted?: boolean;
    message?: string;
  } | null;
  if (errObj?.isQuotaExhausted) {
    return {
      status: 429,
      message:
        errObj.message ||
        'AI service quota limit reached for the free tier. Please try again later or attach a billing-enabled GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (errObj?.isServiceUnavailable) {
    return {
      status: 503,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    };
  }

  const classified = classifyGeminiError(error);
  console.error(
    `[AUREON AI] Returning error response (status=${classified.status ?? 500}): ${sanitizeForLog(
      classified.rawMessage.slice(0, 300)
    )}`
  );

  if (classified.isMissingKey) {
    return {
      status: 503,
      message:
        'AI service credentials are not configured. Please verify GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }

  if (classified.isAuthError) {
    return {
      status: 403,
      message:
        'Gemini API key authorization failed. Please check your API key configuration in Settings > Secrets.',
    };
  }

  if (classified.isDailyQuotaExhausted) {
    return {
      status: 429,
      message:
        'AI service quota limit reached for the free tier. Please try again later or attach a billing-enabled GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (classified.retryable || classified.shouldFallbackImmediately || classified.status === 503) {
    return {
      status: 503,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    status: classified.status && classified.status >= 400 && classified.status < 500 ? classified.status : 503,
    message: SERVICE_UNAVAILABLE_MESSAGE,
  };
}
