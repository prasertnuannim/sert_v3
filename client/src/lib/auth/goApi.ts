type GoApiFetchInit = RequestInit & {
  accessToken: string;
};

export async function goApiFetch(
  input: string,
  init: GoApiFetchInit,
) {
  const { accessToken, ...requestInit } = init;

  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const res = await fetch(`${process.env.GO_API_URL}${input}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(requestInit.headers ?? {}),
    },
    cache: "no-store",
  });

  return res;
}
