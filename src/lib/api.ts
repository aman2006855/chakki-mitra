// All API calls use this to ensure credentials (cookies) are sent
export async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}
