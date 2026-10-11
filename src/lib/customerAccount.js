const storeDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();
const clientId = import.meta.env.VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
const sessionKey = "raized-customer-account-session";
const transactionKey = "raized-customer-account-auth";
const legacySessionKey = "raized-legacy-customer-session";

export const isCustomerAccountConfigured = Boolean(storeDomain && clientId);

function normalizedStoreDomain() {
  if (!storeDomain) {
    throw new Error("Shopify store domain is not configured.");
  }
  return storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getRedirectUri() {
  return (
    import.meta.env.VITE_SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI?.trim() ||
    `${window.location.origin}/account/callback`
  );
}

function getLogoutRedirectUri() {
  return (
    import.meta.env.VITE_SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URI?.trim() ||
    `${window.location.origin}/`
  );
}

function encodeBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function randomBase64Url(byteLength = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function createCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

async function discoverEndpoints() {
  const origin = `https://${normalizedStoreDomain()}`;
  const [authResponse, apiResponse] = await Promise.all([
    fetch(`${origin}/.well-known/openid-configuration`),
    fetch(`${origin}/.well-known/customer-account-api`),
  ]);
  if (!authResponse.ok || !apiResponse.ok) {
    throw new Error("Unable to discover Shopify customer account endpoints.");
  }
  const [authConfig, apiConfig] = await Promise.all([
    authResponse.json(),
    apiResponse.json(),
  ]);
  if (
    !authConfig.authorization_endpoint ||
    !authConfig.token_endpoint ||
    !authConfig.end_session_endpoint ||
    !authConfig.issuer ||
    !apiConfig.graphql_api
  ) {
    throw new Error("Shopify returned incomplete customer account settings.");
  }
  const endpointUrls = [
    authConfig.authorization_endpoint,
    authConfig.token_endpoint,
    authConfig.end_session_endpoint,
    authConfig.issuer,
    apiConfig.graphql_api,
  ].map((endpoint) => new URL(endpoint));
  if (endpointUrls.some((endpoint) => endpoint.protocol !== "https:")) {
    throw new Error("Shopify returned an insecure customer account endpoint.");
  }
  return {
    authorizationEndpoint: authConfig.authorization_endpoint,
    tokenEndpoint: authConfig.token_endpoint,
    endSessionEndpoint: authConfig.end_session_endpoint,
    issuer: authConfig.issuer,
    graphqlEndpoint: apiConfig.graphql_api,
  };
}

async function requestToken(endpoint, fields) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Shopify could not complete customer authentication.",
    );
  }
  return payload;
}

function readIdTokenClaims(idToken) {
  if (!idToken) {
    throw new Error("Shopify did not return an identity token.");
  }
  const [, encodedClaims] = idToken.split(".");
  if (!encodedClaims) {
    throw new Error("Shopify returned an invalid identity token.");
  }
  try {
    return JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedClaims)),
    );
  } catch (error) {
    throw new Error("Shopify returned an invalid identity token.", {
      cause: error,
    });
  }
}

function saveSession(tokenPayload, endpoints, previousSession = {}) {
  const session = {
    accessToken: tokenPayload.access_token,
    idToken: tokenPayload.id_token || previousSession.idToken || "",
    refreshToken:
      tokenPayload.refresh_token || previousSession.refreshToken || "",
    expiresAt: Date.now() + Number(tokenPayload.expires_in || 0) * 1000,
    graphqlEndpoint: endpoints.graphqlEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint || previousSession.tokenEndpoint,
    endSessionEndpoint:
      endpoints.endSessionEndpoint || previousSession.endSessionEndpoint,
    issuer: endpoints.issuer || previousSession.issuer,
  };
  if (!session.accessToken || session.expiresAt <= Date.now()) {
    throw new Error("Shopify returned an invalid customer access token.");
  }
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

export async function beginCustomerLogin(returnTo = "/account", email = "") {
  if (!isCustomerAccountConfigured) {
    throw new Error("Shopify customer account login is not configured.");
  }
  const endpoints = await discoverEndpoints();
  const state = randomBase64Url();
  const nonce = randomBase64Url();
  const verifier = randomBase64Url(48);
  const challenge = await createCodeChallenge(verifier);
  const redirectUri = getRedirectUri();
  sessionStorage.setItem(
    transactionKey,
    JSON.stringify({ state, nonce, verifier, redirectUri, returnTo, endpoints }),
  );
  const authorizationUrl = new URL(endpoints.authorizationEndpoint);
  const params = {
    scope: "openid email customer-account-api:full",
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  };
  if (email.trim()) params.login_hint = email.trim();
  authorizationUrl.search = new URLSearchParams(params).toString();
  window.location.assign(authorizationUrl.toString());
}

export async function completeCustomerLogin(callbackUrl) {
  const callback = new URL(callbackUrl);
  const error = callback.searchParams.get("error");
  if (error) {
    sessionStorage.removeItem(transactionKey);
    throw new Error(
      callback.searchParams.get("error_description") ||
        `Shopify sign-in failed: ${error}`,
    );
  }
  const transactionJson = sessionStorage.getItem(transactionKey);
  sessionStorage.removeItem(transactionKey);
  if (!transactionJson) {
    throw new Error("Sign-in expired. Please try signing in again.");
  }
  const transaction = JSON.parse(transactionJson);
  const code = callback.searchParams.get("code");
  if (!code || callback.searchParams.get("state") !== transaction.state) {
    throw new Error("Shopify sign-in could not be verified. Please try again.");
  }
  const tokenPayload = await requestToken(transaction.endpoints.tokenEndpoint, {
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: transaction.redirectUri,
    code,
    code_verifier: transaction.verifier,
  });
  const claims = readIdTokenClaims(tokenPayload.id_token);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== transaction.endpoints.issuer ||
    !audience.includes(clientId) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    (claims.nbf !== undefined &&
      (typeof claims.nbf !== "number" || claims.nbf > now)) ||
    claims.nonce !== transaction.nonce
  ) {
    throw new Error("Shopify sign-in could not be verified. Please try again.");
  }
  const session = saveSession(tokenPayload, transaction.endpoints);
  return { session, returnTo: transaction.returnTo };
}

function readSession() {
  const serializedSession = sessionStorage.getItem(sessionKey);
  if (!serializedSession) return null;
  try {
    return JSON.parse(serializedSession);
  } catch (error) {
    sessionStorage.removeItem(sessionKey);
    throw new Error("Saved sign-in data is invalid. Please sign in again.", {
      cause: error,
    });
  }
}

export async function restoreCustomerSession() {
  sessionStorage.removeItem(legacySessionKey);
  const session = readSession();
  if (!session) return null;
  if (session.expiresAt > Date.now() + 30_000) return session;
  if (!session.refreshToken) {
    sessionStorage.removeItem(sessionKey);
    return null;
  }
  try {
    const tokenPayload = await requestToken(session.tokenEndpoint, {
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: session.refreshToken,
    });
    return saveSession(tokenPayload, session, session);
  } catch (error) {
    sessionStorage.removeItem(sessionKey);
    throw error;
  }
}

async function customerAccountRequest(query, variables = {}) {
  const session = await restoreCustomerSession();
  if (!session) {
    throw new Error("Please sign in to view your customer account.");
  }
  const response = await fetch(session.graphqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.map(({ message }) => message).join(" ") ||
        `Shopify account request failed (${response.status}).`,
    );
  }
  return { session, customer: payload.data.customer };
}

export function getCustomerProfile() {
  return customerAccountRequest(`query CustomerProfile {
    customer {
      id
      firstName
      lastName
      displayName
      emailAddress { emailAddress }
    }
  }`);
}

export async function getCustomerOrders(after = null) {
  const result = await customerAccountRequest(
    `query CustomerOrders($after: String) {
      customer {
        id
        firstName
        lastName
        displayName
        emailAddress { emailAddress }
        orders(first: 20, after: $after, reverse: true) {
          nodes {
            id
            name
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice { amount currencyCode }
            fulfillments(first: 10) {
              nodes {
                trackingInformation {
                  company
                  number
                  url
                }
              }
            }
            lineItems(first: 20) {
              nodes {
                title
                quantity
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    { after },
  );
  return {
    session: result.session,
    customer: result.customer,
    orders: result.customer.orders.nodes,
    pageInfo: result.customer.orders.pageInfo,
  };
}

export function endCustomerSession() {
  const session = readSession();
  sessionStorage.removeItem(sessionKey);
  sessionStorage.removeItem(transactionKey);
  if (!session?.idToken || !session.endSessionEndpoint) return null;
  const logoutUrl = new URL(session.endSessionEndpoint);
  logoutUrl.searchParams.set("id_token_hint", session.idToken);
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("post_logout_redirect_uri", getLogoutRedirectUri());
  return logoutUrl.toString();
}
