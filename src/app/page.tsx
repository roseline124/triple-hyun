import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>직업이 사라져도, 길드와 함께 전직한다</h1>
      <p className="muted">내 능력을 확인하고, 길드에 가입하고, 퀘스트로 수익을 만드세요.</p>
      <p>
        <Link href="/scan">내 능력 검사하기 →</Link>
      </p>
    </>
  );
}
