const express = require("express");
const ExcelJS = require("exceljs");
const config = require("./config");
const { fetchAllOrders, validateRows, COLUMNS } = require("./orderService");

const app = express();

// GET /api/orders — returns flat JSON (1 row per product line, 59 columns)
app.get("/api/orders", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const rows = await fetchAllOrders({ limit });

    res.json({
      success: true,
      count: rows.length,
      columns: COLUMNS.map((c) => c.key),
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/export — downloads Excel file (single sheet, flat table)
app.get("/api/orders/export", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const rows = await fetchAllOrders({ limit });

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "No orders found to export." });
    }

    // Validate required fields
    const errors = validateRows(rows);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Export stopped: missing required fields.",
        missingFields: errors,
      });
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shopify Orders API";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Orders");

    // Header row
    sheet.columns = COLUMNS.map((col) => ({
      header: col.key,
      key: col.key,
      width: 20,
    }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };

    // Add data rows
    for (const row of rows) {
      sheet.addRow(row);
    }

    // Set response headers for Excel download
    const filename = `orders_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting orders:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
  console.log(`Orders JSON:  http://localhost:${config.port}/api/orders`);
  console.log(`Orders Excel: http://localhost:${config.port}/api/orders/export`);
  console.log(`Health check: http://localhost:${config.port}/health`);
});
