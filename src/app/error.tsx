"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <p className="error">Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
