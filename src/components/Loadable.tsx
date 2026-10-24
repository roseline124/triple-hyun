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
  if (state.status === "loading") return <p role="status">Loading…</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="error">
        Couldn&apos;t load the data. Please refresh the page.
      </p>
    );
  }
  if (isEmpty(state.data)) return <p className="muted">{empty}</p>;
  return <>{children(state.data)}</>;
}
