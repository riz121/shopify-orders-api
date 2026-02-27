const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const config = {
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  },
  port: process.env.PORT || 3000,
};

if (!config.shopify.storeDomain || !config.shopify.accessToken) {
  console.error(
    "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ACCESS_TOKEN in .env"
  );
  process.exit(1);
}

module.exports = config;
