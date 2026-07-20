type GoApiFetchInit = RequestInit & {
  accessToken: string;
};

export type ProviderAccessTokenResponse = {
  provider: string;
  access_token: string;
  expires_at?: number | null;
  token_type?: string;
  scope?: string;
  refreshed: boolean;
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

export async function getProviderAccessToken(
  provider: string,
  accessToken: string,
): Promise<ProviderAccessTokenResponse> {
  const normalizedProvider = provider.trim();
  if (!normalizedProvider) {
    throw new Error("Provider is required");
  }

  const res = await goApiFetch(
    `/auth/providers/${encodeURIComponent(normalizedProvider)}/token`,
    {
      method: "GET",
      accessToken,
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch ${normalizedProvider} provider token`);
  }

  return res.json() as Promise<ProviderAccessTokenResponse>;
}
