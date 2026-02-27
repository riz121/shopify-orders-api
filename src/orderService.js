const { shopifyRest } = require("./shopifyClient");

function toInt(value) {
  if (value == null) return 0;
  return Math.round(parseFloat(value));
}

function mapCustomerToUser(order) {
  const customer = order.customer;
  if (!customer) {
    return {
      id: "",
      email: order.email || "",
      name: "",
      company: "",
      country: "",
      countryCode: "",
      region: "",
      vendor: "",
      discountRate: 0,
      useCogsPrice: false,
      pocName: "",
      address1: "",
      address2: "",
      zipCode: "",
      phone: "",
      fax: "",
    };
  }

  const addr = customer.default_address || {};
  return {
    id: String(customer.id),
    email: customer.email || "",
    name: [customer.first_name, customer.last_name].filter(Boolean).join(" "),
    company: addr.company || "",
    country: addr.country || "",
    countryCode: addr.country_code || "",
    region: addr.province || "",
    vendor: "",
    discountRate: 0,
    useCogsPrice: false,
    pocName: "",
    address1: addr.address1 || "",
    address2: addr.address2 || "",
    zipCode: addr.zip || "",
    phone: customer.phone || addr.phone || "",
    fax: "",
  };
}

function mapLineItems(lineItems) {
  if (!lineItems || !lineItems.length) return [];
  return lineItems.map((item) => ({
    productId: String(item.product_id || ""),
    sku: item.sku || "",
    quantity: item.quantity || 1,
    name: item.name || "",
    airtableId: "",
    price: toInt(item.price),
  }));
}

function mapAddress(addr) {
  if (!addr) {
    return {
      name: "",
      company: "",
      country: "",
      countryCode: "",
      address1: "",
      address2: "",
      cityName: "",
      zipCode: "",
      phone: "",
      email: "",
    };
  }
  return {
    name: addr.name || "",
    company: addr.company || "",
    country: addr.country || "",
    countryCode: addr.country_code || "",
    address1: addr.address1 || "",
    address2: addr.address2 || "",
    cityName: addr.city || "",
    zipCode: addr.zip || "",
    phone: addr.phone || "",
    email: "",
  };
}

function mapOrder(order) {
  const user = mapCustomerToUser(order);
  const products = mapLineItems(order.line_items);
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

  const fulfillment = order.fulfillments?.[0];
  const shippingLine = order.shipping_lines?.[0];

  return {
    user,
    order: {
      userId: order.customer ? String(order.customer.id) : "",
      orderId: order.name || "",
      itemCount: totalQuantity,
      msrpPrice: 0,
      totalPrice: toInt(order.total_price),
      status: order.fulfillment_status || order.financial_status || "",
      shippingMethod: "",
      deliveryFee: toInt(order.total_shipping_price_set?.shop_money?.amount),
      freightForwarder: fulfillment?.tracking_company || "",
      freightType: shippingLine?.title || "",
      trackingNumber: fulfillment?.tracking_number || "",
      exportProcessingFee: 0,
      vat: parseFloat(order.total_tax || 0),
      packingDate: "",
      pickupDate: "",
      paymentReceived: 0,
      paymentReceivedAt: null,
      memo: order.note || "",
    },
    orderProducts: products,
    shippingAddress: mapAddress(order.shipping_address),
    billingAddress: mapAddress(order.billing_address),
  };
}

async function fetchAllOrders({ limit = 50 } = {}) {
  const allOrders = [];
  let pageInfo = null;
  const pageSize = Math.min(limit, 250);

  const data = await shopifyRest("orders", {
    limit: pageSize,
    status: "any",
  });

  for (const order of data.orders) {
    allOrders.push(mapOrder(order));
  }

  return allOrders;
}

module.exports = { fetchAllOrders };
