const { shopifyRest } = require("./shopifyClient");

// Region mapping: country code → region
const REGION_MAP = {
  US: "North America", CA: "North America", MX: "North America",
  GB: "Europe", DE: "Europe", FR: "Europe", IT: "Europe", ES: "Europe",
  NL: "Europe", BE: "Europe", AT: "Europe", CH: "Europe", SE: "Europe",
  NO: "Europe", DK: "Europe", FI: "Europe", PL: "Europe", PT: "Europe",
  IE: "Europe", CZ: "Europe", RO: "Europe", HU: "Europe", GR: "Europe",
  JP: "Asia", KR: "Asia", CN: "Asia", TW: "Asia", HK: "Asia",
  SG: "Asia", TH: "Asia", VN: "Asia", MY: "Asia", PH: "Asia",
  IN: "Asia", ID: "Asia",
  AU: "Oceania", NZ: "Oceania",
  BR: "South America", AR: "South America", CL: "South America",
  CO: "South America", PE: "South America",
  AE: "Middle East", SA: "Middle East", IL: "Middle East",
  ZA: "Africa", NG: "Africa", EG: "Africa", KE: "Africa",
};

// 59 column definitions in order
const COLUMNS = [
  { key: "userId", label: "userId", required: true },
  { key: "userEmail", label: "userEmail", required: true },
  { key: "userName", label: "userName", required: false },
  { key: "userCompany", label: "userCompany", required: false },
  { key: "userCountry", label: "userCountry", required: false },
  { key: "userCountryCode", label: "userCountryCode", required: false },
  { key: "userRegion", label: "userRegion", required: false },
  { key: "userVendor", label: "userVendor", required: false },
  { key: "userDiscountRate", label: "userDiscountRate", required: false },
  { key: "userUseCogsPrice", label: "userUseCogsPrice", required: false },
  { key: "userPocName", label: "userPocName", required: false },
  { key: "userAddress1", label: "userAddress1", required: false },
  { key: "userAddress2", label: "userAddress2", required: false },
  { key: "userZipCode", label: "userZipCode", required: false },
  { key: "userPhone", label: "userPhone", required: false },
  { key: "userFax", label: "userFax", required: false },
  { key: "orderId", label: "orderId", required: true },
  { key: "itemCount", label: "itemCount", required: true },
  { key: "msrpPrice", label: "msrpPrice", required: true },
  { key: "totalPrice", label: "totalPrice", required: true },
  { key: "status", label: "status", required: false },
  { key: "shippingMethod", label: "shippingMethod", required: false },
  { key: "deliveryFee", label: "deliveryFee", required: false },
  { key: "freightForwarder", label: "freightForwarder", required: false },
  { key: "freightType", label: "freightType", required: false },
  { key: "trackingNumber", label: "trackingNumber", required: false },
  { key: "exportProcessingFee", label: "exportProcessingFee", required: false },
  { key: "vat", label: "vat", required: false },
  { key: "packingDate", label: "packingDate", required: false },
  { key: "pickupDate", label: "pickupDate", required: false },
  { key: "paymentReceived", label: "paymentReceived", required: false },
  { key: "paymentReceivedAt", label: "paymentReceivedAt", required: false },
  { key: "memo", label: "memo", required: false },
  { key: "productId", label: "productId", required: true },
  { key: "sku", label: "sku", required: true },
  { key: "quantity", label: "quantity", required: false },
  { key: "productName", label: "productName", required: true },
  { key: "airtableId", label: "airtableId", required: false },
  { key: "price", label: "price", required: true },
  { key: "shipToName", label: "shipToName", required: true },
  { key: "shipToCompany", label: "shipToCompany", required: false },
  { key: "shipToCountry", label: "shipToCountry", required: true },
  { key: "shipToCountryCode", label: "shipToCountryCode", required: true },
  { key: "shipToAddress1", label: "shipToAddress1", required: true },
  { key: "shipToAddress2", label: "shipToAddress2", required: false },
  { key: "shipToCityName", label: "shipToCityName", required: true },
  { key: "shipToZipCode", label: "shipToZipCode", required: true },
  { key: "shipToPhone", label: "shipToPhone", required: false },
  { key: "shipToEmail", label: "shipToEmail", required: true },
  { key: "billToName", label: "billToName", required: true },
  { key: "billToCompany", label: "billToCompany", required: false },
  { key: "billToCountry", label: "billToCountry", required: false },
  { key: "billToCountryCode", label: "billToCountryCode", required: false },
  { key: "billToAddress1", label: "billToAddress1", required: true },
  { key: "billToAddress2", label: "billToAddress2", required: false },
  { key: "billToCityName", label: "billToCityName", required: false },
  { key: "billToZipCode", label: "billToZipCode", required: true },
  { key: "billToPhone", label: "billToPhone", required: false },
  { key: "billToEmail", label: "billToEmail", required: false },
];

function toUsdInt(value) {
  if (value == null || value === "") return 0;
  return Math.round(parseFloat(value));
}

function getRegion(countryCode) {
  return REGION_MAP[countryCode] || "";
}

// Build a grouped order object with nested products array
function mapOrderToGrouped(order) {
  const customer = order.customer;
  const shipAddr = order.shipping_address || {};
  const billAddr = order.billing_address || {};
  const lineItems = order.line_items || [];
  const fulfillment = order.fulfillments?.[0];
  const shippingLine = order.shipping_lines?.[0];

  const itemCount = lineItems.reduce((sum, li) => sum + (li.quantity || 1), 0);
  const customerAddr = customer?.default_address || {};
  const countryCode = customerAddr.country_code || shipAddr.country_code || "";
  const email = order.email || customer?.email || "";

  // Discount rate: total discounts / subtotal
  const subtotal = parseFloat(order.subtotal_price || 0);
  const totalDiscount = parseFloat(order.total_discounts || 0);
  const discountRate = subtotal > 0 ? Math.round((totalDiscount / subtotal) * 100) / 100 : 0;

  // Payment received logic
  const isPaid = order.financial_status === "paid" || order.financial_status === "partially_paid";
  const paymentReceived = isPaid ? toUsdInt(order.total_price) : 0;
  const paymentReceivedAt = order.processed_at || "";

  // Delivery fee: sum of shipping lines
  const deliveryFee = (order.shipping_lines || []).reduce(
    (sum, sl) => sum + toUsdInt(sl.price), 0
  );

  // Products array
  const products = lineItems.length === 0
    ? [{ productId: "", sku: "", quantity: 0, productName: "", airtableId: "", price: 0 }]
    : lineItems.map((item) => ({
        productId: String(item.product_id || ""),
        sku: item.sku || "",
        quantity: item.quantity || 1,
        productName: item.title || item.name || "",
        airtableId: "",
        price: toUsdInt(item.price),
      }));

  return {
    userId: String(customer?.id || ""),
    userEmail: email,
    userName: customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
      : shipAddr.name || "",
    userCompany: customerAddr.company || shipAddr.company || "",
    userCountry: customerAddr.country || shipAddr.country || "",
    userCountryCode: countryCode,
    userRegion: getRegion(countryCode),
    userVendor: "",
    userDiscountRate: discountRate,
    userUseCogsPrice: false,
    userPocName: "",
    userAddress1: customerAddr.address1 || "",
    userAddress2: customerAddr.address2 || "",
    userZipCode: customerAddr.zip || "",
    userPhone: customer?.phone || customerAddr.phone || "",
    userFax: "",
    orderId: order.name || "",
    itemCount,
    msrpPrice: 0,
    totalPrice: toUsdInt(order.total_price),
    status: order.fulfillment_status || order.financial_status || "",
    shippingMethod: "",
    deliveryFee,
    freightForwarder: fulfillment?.tracking_company || "",
    freightType: shippingLine?.title || "",
    trackingNumber: fulfillment?.tracking_number || "",
    exportProcessingFee: 30,
    vat: parseFloat(order.total_tax || 0),
    packingDate: "",
    pickupDate: "",
    paymentReceived,
    paymentReceivedAt,
    memo: order.note || "",
    // Shipping address
    shipToName: shipAddr.name || "",
    shipToCompany: shipAddr.company || "",
    shipToCountry: shipAddr.country || "",
    shipToCountryCode: shipAddr.country_code || "",
    shipToAddress1: shipAddr.address1 || "",
    shipToAddress2: shipAddr.address2 || "",
    shipToCityName: shipAddr.city || "",
    shipToZipCode: shipAddr.zip || "",
    shipToPhone: shipAddr.phone || "",
    shipToEmail: email,
    // Billing address
    billToName: billAddr.name || "",
    billToCompany: billAddr.company || "",
    billToCountry: billAddr.country || "",
    billToCountryCode: billAddr.country_code || "",
    billToAddress1: billAddr.address1 || "",
    billToAddress2: billAddr.address2 || "",
    billToCityName: billAddr.city || "",
    billToZipCode: billAddr.zip || "",
    billToPhone: billAddr.phone || "",
    billToEmail: email,
    // Nested products
    products,
  };
}

// Flatten a grouped order into 1 row per line item (for Excel export)
function flattenGroupedOrder(grouped) {
  const { products, ...orderFields } = grouped;
  return products.map((product) => ({ ...orderFields, ...product }));
}

// Validate required fields; returns array of error messages
function validateRows(rows) {
  const errors = [];
  rows.forEach((row, i) => {
    COLUMNS.forEach((col) => {
      if (col.required) {
        const val = row[col.key];
        if (val === undefined || val === null || val === "") {
          errors.push(`Row ${i + 1}: missing required field "${col.key}"`);
        }
      }
    });
  });
  return errors;
}

async function fetchAllOrders({ limit = 50 } = {}) {
  const pageSize = Math.min(limit, 250);
  const data = await shopifyRest("orders", {
    limit: pageSize,
    status: "any",
  });

  return data.orders.map(mapOrderToGrouped);
}

// Flatten grouped orders into flat rows (for Excel export)
function flattenOrders(groupedOrders) {
  const allRows = [];
  for (const order of groupedOrders) {
    allRows.push(...flattenGroupedOrder(order));
  }
  return allRows;
}

module.exports = { fetchAllOrders, flattenOrders, validateRows, COLUMNS };
