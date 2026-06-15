import type { CloudbetErrorResponse } from "./cloudbet-types";

export class CloudbetApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: CloudbetErrorResponse,
  ) {
    super(message);
    this.name = "CloudbetApiError";
  }
}

export interface CloudbetRequestOptions {
  query?: Record<string, string | number | boolean | readonly string[] | undefined>;
  signal?: AbortSignal;
}

export interface CloudbetMutationOptions<TBody extends object> extends CloudbetRequestOptions {
  body: TBody;
}

function getCloudbetConfig() {
  const apiKey = process.env.CLOUDBET_API_KEY;
  const baseUrl = process.env.CLOUDBET_BASE_URL ?? "https://sports-api.cloudbet.com";

  if (!apiKey) {
    throw new Error("Missing CLOUDBET_API_KEY environment variable.");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

function appendQueryParams(url: URL, query?: CloudbetRequestOptions["query"]) {
  if (!query) {
    return;
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }

    url.searchParams.set(key, String(value));
  });
}

async function parseError(response: Response): Promise<CloudbetErrorResponse | undefined> {
  try {
    return (await response.json()) as CloudbetErrorResponse;
  } catch {
    return undefined;
  }
}

async function cloudbetFetch<TResponse>(
  method: "GET" | "POST",
  path: string,
  options: CloudbetRequestOptions & { body?: object } = {},
): Promise<TResponse> {
  const { apiKey, baseUrl } = getCloudbetConfig();
  const url = new URL(`/pub${path}`, baseUrl);
  appendQueryParams(url, options.query);

  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-API-Key": apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    const details = await parseError(response);
    throw new CloudbetApiError(
      details?.message ?? `Cloudbet request failed with status ${response.status}`,
      response.status,
      details,
    );
  }

  return (await response.json()) as TResponse;
}

export async function cloudbetGet<TResponse>(
  path: string,
  options: CloudbetRequestOptions = {},
): Promise<TResponse> {
  return cloudbetFetch<TResponse>("GET", path, options);
}

export async function cloudbetPost<TResponse, TBody extends object>(
  path: string,
  options: CloudbetMutationOptions<TBody>,
): Promise<TResponse> {
  return cloudbetFetch<TResponse>("POST", path, options);
}
