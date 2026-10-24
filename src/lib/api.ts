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

/** 서비스가 throw 하면 route 가 같은 code/message/status 로 응답한다. message 는 화면에 보이므로 영어로 쓴다. */
export class ApiFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** ApiFailure 는 그대로, 그 밖의 예외는 fallback 문구의 500 으로 바꾼다. */
export function failFrom(e: unknown, fallback: string): Response {
  if (e instanceof ApiFailure) return fail(e.code, e.message, e.status);
  return fail("internal", fallback, 500);
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
