export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof (body as Record<string, unknown>).error === "string"
        ? (body as { error: string }).error
        : res.statusText;
    const err = new Error(message) as Error & { response: Response };
    err.response = res;
    throw err;
  }

  return res.json() as Promise<T>;
}
