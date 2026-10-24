"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <p className="error">문제가 발생했습니다.</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
