const config = require("./config");

const BASE_URL = `https://${config.shopify.storeDomain}/admin/api/2024-10`;
console.log("Shopify API Base URL:", BASE_URL);

async function shopifyRest(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}.json`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-Shopify-Access-Token": config.shopify.accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  return response.json();
}

module.exports = { shopifyRest };
