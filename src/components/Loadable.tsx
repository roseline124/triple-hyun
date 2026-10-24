import type { ReactNode } from "react";
import type { AsyncState } from "@/lib/useAsync";

/** loading / error / empty / success 를 한 곳에서 처리한다. */
export function Loadable<T>({
  state,
  isEmpty,
  empty,
  children,
}: {
  state: AsyncState<T>;
  isEmpty: (data: T) => boolean;
  empty: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") return <p role="status">불러오는 중…</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="error">
        데이터를 불러오지 못했습니다. 새로고침 해주세요.
      </p>
    );
  }
  if (isEmpty(state.data)) return <p className="muted">{empty}</p>;
  return <>{children(state.data)}</>;
}
