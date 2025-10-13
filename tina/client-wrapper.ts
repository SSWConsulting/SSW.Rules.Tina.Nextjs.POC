"use client";

// Import the base client from generated files to get the queries
import generatedClient from "./__generated__/client";

// Determine if we're using Tina Cloud or local mode
const isCloudMode = () => {
  return !!(
    process.env.NEXT_PUBLIC_TINA_CLIENT_ID &&
    process.env.NEXT_PUBLIC_TINA_CLIENT_ID !== ""
  );
};

// Get the correct GraphQL endpoint based on environment
const getGraphQLUrl = () => {
  // PRIORITY 1: If we're on localhost, ALWAYS use the local dev server
  // This is important because we might have Tina Cloud credentials set but still want to develop locally
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log("[TinaCMS] Using local dev server: http://localhost:4001/graphql");
      return "http://localhost:4001/graphql";
    }
  }

  // PRIORITY 2: If we're in production and have Tina Cloud configured, use it
  if (isCloudMode()) {
    const clientId = process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
    const branch = process.env.NEXT_PUBLIC_TINA_BRANCH || "main";
    const url = `https://content.tinajs.io/content/${clientId}/github/${branch}`;
    console.log("[TinaCMS] Using Tina Cloud:", url);
    return url;
  }

  // PRIORITY 3: Production without cloud configuration
  if (typeof window !== "undefined") {
    console.error(
      "[TinaCMS] ERROR: Using TinaCMS client in production without Tina Cloud configuration. " +
      "The admin panel queries will NOT work. " +
      "Please set NEXT_PUBLIC_TINA_CLIENT_ID in your environment variables."
    );
  }

  // Fallback to localhost (will only work in dev)
  console.log("[TinaCMS] Fallback to localhost:4001");
  return "http://localhost:4001/graphql";
};

// Get the correct token based on environment
const getToken = () => {
  // For Tina Cloud, we need the public read token
  // For local dev, we use the local token (already set in generated client)
  if (typeof window !== "undefined" &&
      (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")) {
    // In production, try to get the public token
    const publicToken = process.env.NEXT_PUBLIC_TINA_TOKEN;
    if (publicToken) {
      console.log("[TinaCMS] Using NEXT_PUBLIC_TINA_TOKEN for production");
      return publicToken;
    }
    console.warn("[TinaCMS] NEXT_PUBLIC_TINA_TOKEN not found, using default token");
  }
  // Use the token from generated client (default for local dev)
  return (generatedClient as any).token || "5324467c48b68eed4dec5c89eabdfc022ccfc5f4";
};

let clientInstance: typeof generatedClient | null = null;

// Create a singleton client that initializes lazily by modifying the generated client's URL
export const getClient = () => {
  if (!clientInstance) {
    const url = getGraphQLUrl();
    const token = getToken();

    console.log("[TinaCMS] Creating client with URL:", url);
    console.log("[TinaCMS] Using token:", token ? `${token.substring(0, 10)}...` : "none");

    // Override the generated client's URL and token
    (generatedClient as any).apiUrl = url;
    (generatedClient as any).token = token;
    clientInstance = generatedClient;
  }
  return clientInstance;
};

// Create a proxy object that lazily initializes the client
// This ensures the client is only created when actually used (in the browser)
export const client = new Proxy({} as typeof generatedClient, {
  get(_target, prop) {
    const actualClient = getClient();
    const value = actualClient[prop as keyof typeof actualClient];
    return typeof value === "function" ? value.bind(actualClient) : value;
  },
});

export default client;
