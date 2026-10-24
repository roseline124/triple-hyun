import { textInput } from "./ui";

/** 닉네임 + 4자리 PIN 입력. 스캔 폼과 조회 폼이 함께 쓴다. */
export function CredentialFields({
  nickname,
  pin,
  onNickname,
  onPin,
}: {
  nickname: string;
  pin: string;
  onNickname: (v: string) => void;
  onPin: (v: string) => void;
}) {
  return (
    <div className="grid gap-x-4 sm:grid-cols-2">
      <div>
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          className={textInput}
          required
          minLength={2}
          maxLength={20}
          pattern="[A-Za-z0-9 _\-]{2,20}"
          title="2-20 characters: letters, numbers, spaces, _ or -"
          autoComplete="off"
          aria-describedby="nickname-help"
          value={nickname}
          onChange={(e) => onNickname(e.target.value)}
        />
        <p id="nickname-help" className="mt-1 text-caption text-muted">
          2-20 characters: letters, numbers, spaces, _ or -
        </p>
      </div>
      <div>
        <label htmlFor="pin">4-digit PIN</label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          className={textInput}
          required
          maxLength={4}
          pattern="[0-9]{4}"
          title="Exactly 4 digits"
          autoComplete="off"
          aria-describedby="pin-help"
          value={pin}
          onChange={(e) => onPin(e.target.value)}
        />
        <p id="pin-help" className="mt-1 text-caption text-muted">
          You&apos;ll need both to view your results later. A forgotten PIN can&apos;t be recovered.
        </p>
      </div>
    </div>
  );
}
