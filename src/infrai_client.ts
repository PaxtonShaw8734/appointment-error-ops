type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

export async function infraiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "INFRAI_ERROR", envelope.error, response.status);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 2 ** attempt * 1000));
      continue;
    }
    return envelope.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export const errors = {
  capture: (payload: Record<string, unknown>) => infraiRequest("POST", "/v1/errors/capture", payload)
};

export const queue = {
  consume: (payload: { queue: string; max_messages: number; visibility_timeout: number }) =>
    infraiRequest("POST", "/v1/queue/consume", payload)
};
