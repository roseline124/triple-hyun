"use client";

import { listTagSuggestions } from "@/features/guild/service";
import { useAsync } from "@/lib/useAsync";
import { CreateGuildForm } from "./CreateGuildForm";

export default function NewGuildPage() {
  const tags = useAsync(listTagSuggestions);
  // 제안 태그는 부가 기능이라 불러오지 못해도 폼은 쓸 수 있다.
  return (
    <>
      <h1>Create a guild</h1>
      <CreateGuildForm suggestions={tags.status === "success" ? tags.data : []} />
    </>
  );
}
