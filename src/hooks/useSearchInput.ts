import { useState } from "react";

export function useSearchInput() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
  }

  return { q, setQ, search, setSearch, handleSearch };
}
