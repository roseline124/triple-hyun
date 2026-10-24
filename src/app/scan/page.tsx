import { ScanForm } from "./ScanForm";

export default function ScanPage() {
  return (
    <>
      <h1>나의 능력 검사</h1>
      <p className="muted">하던 일을 적으면 AI가 몰랐던 능력과 제2의 직업을 찾아줍니다.</p>
      <ScanForm />
    </>
  );
}
