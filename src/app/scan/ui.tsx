import type { ReactNode } from "react";

export const outlineButton =
  "rounded-pill border-2 border-brown-950 bg-transparent px-6 py-2 min-h-11 font-bold text-brown-950 hover:bg-sand-300 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55";

export const textInput =
  "block w-full min-h-11 rounded-input border-2 border-brown-950 bg-white px-3 py-2 text-body text-brown-950";

/** 바이블 7절 Error: danger-soft 면 + 2px danger 윤곽선, 제목은 무엇이 실패했는지, 본문은 무엇을 하면 되는지. */
export function ErrorTile({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div role="alert" className="my-4 rounded-tile border-2 border-danger bg-danger-soft p-4">
      <p className="m-0 font-bold text-danger">{title}</p>
      <p className="mt-1 mb-0 text-small text-brown-950">{children}</p>
      {actions && <div className="mt-3 flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** 바이블 7절 Loading: 스피너 대신 레이아웃 모양의 skeleton 자리. */
export function LoadingTile({ label, onCancel }: { label: string; onCancel?: () => void }) {
  return (
    <div role="status" aria-busy="true" className="my-4 rounded-tile bg-sand-100 p-6">
      <p className="m-0 font-bold">{label}</p>
      <div aria-hidden="true" className="mt-4 grid gap-3">
        <div className="h-4 w-3/4 rounded-pill bg-skeleton" />
        <div className="h-4 w-1/2 rounded-pill bg-skeleton" />
        <div className="h-4 w-2/3 rounded-pill bg-skeleton" />
      </div>
      {onCancel && (
        <button type="button" className={`${outlineButton} mt-4`} onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
