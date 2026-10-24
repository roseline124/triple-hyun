export type ApiError = { code: string; message: string };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data } satisfies ApiResult<T>, { status });
}

export function fail(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies ApiResult<never>, {
    status,
  });
}

/** 브라우저에서 API를 호출하고 항상 ApiResult 로 정규화한다. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, error: { code: "network", message: "Unable to reach the server." } };
  }
}
