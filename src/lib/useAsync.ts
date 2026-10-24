"use client";

import { useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: T };

/** fn 은 모듈 상수이거나 useCallback 으로 안정화된 함수여야 한다. */
export function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    fn().then(
      (data) => !cancelled && setState({ status: "success", data }),
      () => !cancelled && setState({ status: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [fn]);
  return state;
}
