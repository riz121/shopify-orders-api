const express = require("express");
const config = require("./config");
const { fetchAllOrders } = require("./orderService");

const app = express();

app.get("/api/orders", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const orders = await fetchAllOrders({ limit });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
  console.log(`Orders API: http://localhost:${config.port}/api/orders`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});
