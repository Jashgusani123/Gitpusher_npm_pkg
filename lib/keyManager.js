import { getApiKeyFromDB, handleNoApiKey } from "./apikey.js";

export async function ensureApiKey() {
  let { apiKey } = await getApiKeyFromDB();
  if (!apiKey) {
    await handleNoApiKey();
    const result = await getApiKeyFromDB();
    apiKey = result.apiKey;
  }
  return !!apiKey;
}
