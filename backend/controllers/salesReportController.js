import Order from "../models/Order.js";
import {
  createPdfReport,
  createExcelReport,
  createDocxReport,
} from "../services/reportExportService.js";

const getDateRange = (req) => {
  const { startDate, endDate } = req.query;

  const end = endDate
    ? new Date(`${endDate}T23:59:59.999`)
    : new Date();

  const start = startDate
    ? new Date(`${startDate}T00:00:00.000`)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { start, end };
};

const buildSalesReport = async (req) => {
  const { start, end } = getDateRange(req);

  const orders = await Order.find({
    createdAt: {
      $gte: start,
      $lte: end,
    },
    orderStatus: {
      $nin: ["CANCELLED", "RETURNED"],
    },
  })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  const rows = orders.map((order) => ({
    orderNumber: order.orderNumber || "",
    customerName:
      order.user?.name || order.shippingAddress?.fullName || "Customer",
    customerEmail:
      order.user?.email || order.shippingAddress?.email || "",
    customerPhone:
      order.user?.phone || order.shippingAddress?.phone || "",
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    itemCount: (order.items || []).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    ),
    subtotal: Number(order.subtotal || 0),
    shippingCharge: Number(order.shippingCharge || 0),
    discount: Number(order.discount || 0),
    totalAmount: Number(order.totalAmount || 0),
    createdAt: order.createdAt,
  }));

  const summary = rows.reduce(
    (result, row) => {
      result.totalOrders += 1;
      result.totalItems += row.itemCount;
      result.subtotal += row.subtotal;
      result.shippingCharge += row.shippingCharge;
      result.discount += row.discount;
      result.totalAmount += row.totalAmount;
      return result;
    },
    {
      totalOrders: 0,
      totalItems: 0,
      subtotal: 0,
      shippingCharge: 0,
      discount: 0,
      totalAmount: 0,
    },
  );

  return {
    start,
    end,
    summary,
    rows,
  };
};

export const getSalesReport = async (req, res) => {
  try {
    const report = await buildSalesReport(req);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Sales report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate sales report",
      error: error.message,
    });
  }
};

export const exportSalesReportPdf = async (req, res) => {
  try {
    const report = await buildSalesReport(req);
    const pdfBuffer = await createPdfReport(report);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sales-report.pdf"',
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("PDF export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export PDF report",
      error: error.message,
    });
  }
};

export const exportSalesReportExcel = async (req, res) => {
  try {
    const report = await buildSalesReport(req);
    const excelBuffer = await createExcelReport(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sales-report.xlsx"',
    );

    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error("Excel export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export Excel report",
      error: error.message,
    });
  }
};

export const exportSalesReportDocx = async (req, res) => {
  try {
    const report = await buildSalesReport(req);
    const docxBuffer = await createDocxReport(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sales-report.docx"',
    );

    return res.status(200).send(docxBuffer);
  } catch (error) {
    console.error("DOCX export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export DOCX report",
      error: error.message,
    });
  }
};