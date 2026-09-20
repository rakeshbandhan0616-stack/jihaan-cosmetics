import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
} from "docx";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const dateText = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN");
};

export const createPdfReport = async (report) => {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const chunks = [];

    document.on("data", (chunk) => chunks.push(chunk));

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    document
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Sales Report", { align: "center" });

    document.moveDown();

    document
      .fontSize(10)
      .font("Helvetica")
      .text(`From: ${dateText(report.start)}`)
      .text(`To: ${dateText(report.end)}`);

    document.moveDown();

    document.fontSize(12).font("Helvetica-Bold").text("Summary");

    document
      .fontSize(10)
      .font("Helvetica")
      .text(`Total Orders: ${report.summary.totalOrders}`)
      .text(`Total Items: ${report.summary.totalItems}`)
      .text(`Subtotal: ${money(report.summary.subtotal)}`)
      .text(`Shipping: ${money(report.summary.shippingCharge)}`)
      .text(`Discount: ${money(report.summary.discount)}`)
      .text(`Total Revenue: ${money(report.summary.totalAmount)}`);

    document.moveDown();

    document.fontSize(12).font("Helvetica-Bold").text("Orders");

    document.moveDown(0.5);

    report.rows.forEach((row, index) => {
      if (document.y > 730) {
        document.addPage();
      }

      document
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(`${index + 1}. ${row.orderNumber}`);

      document
        .fontSize(8)
        .font("Helvetica")
        .text(`Customer: ${row.customerName}`)
        .text(`Date: ${dateText(row.createdAt)}`)
        .text(`Status: ${row.orderStatus}`)
        .text(`Payment: ${row.paymentMethod} / ${row.paymentStatus}`)
        .text(`Items: ${row.itemCount}`)
        .text(`Amount: ${money(row.totalAmount)}`);

      document.moveDown(0.7);
    });

    document.end();
  });
};

export const createExcelReport = async (report) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Jihaan Cosmetics";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 25 },
  ];

  summarySheet.addRows([
    ["Report Start", dateText(report.start)],
    ["Report End", dateText(report.end)],
    ["Total Orders", report.summary.totalOrders],
    ["Total Items", report.summary.totalItems],
    ["Subtotal", report.summary.subtotal],
    ["Shipping Charge", report.summary.shippingCharge],
    ["Discount", report.summary.discount],
    ["Total Revenue", report.summary.totalAmount],
  ]);

  summarySheet.getRow(1).font = {
    bold: true,
  };

  const ordersSheet = workbook.addWorksheet("Orders");

  ordersSheet.columns = [
    { header: "Order Number", key: "orderNumber", width: 24 },
    { header: "Customer Name", key: "customerName", width: 24 },
    { header: "Customer Email", key: "customerEmail", width: 30 },
    { header: "Customer Phone", key: "customerPhone", width: 18 },
    { header: "Order Status", key: "orderStatus", width: 20 },
    { header: "Payment Status", key: "paymentStatus", width: 18 },
    { header: "Payment Method", key: "paymentMethod", width: 18 },
    { header: "Items", key: "itemCount", width: 10 },
    { header: "Subtotal", key: "subtotal", width: 15 },
    { header: "Shipping", key: "shippingCharge", width: 15 },
    { header: "Discount", key: "discount", width: 15 },
    { header: "Total Amount", key: "totalAmount", width: 15 },
    { header: "Created At", key: "createdAt", width: 25 },
  ];

  ordersSheet.addRows(
    report.rows.map((row) => ({
      ...row,
      createdAt: dateText(row.createdAt),
    })),
  );

  ordersSheet.getRow(1).font = {
    bold: true,
  };

  ordersSheet.autoFilter = {
    from: "A1",
    to: "M1",
  };

  return workbook.xlsx.writeBuffer();
};

export const createDocxReport = async (report) => {
  const summaryRows = [
    ["Report Start", dateText(report.start)],
    ["Report End", dateText(report.end)],
    ["Total Orders", String(report.summary.totalOrders)],
    ["Total Items", String(report.summary.totalItems)],
    ["Subtotal", money(report.summary.subtotal)],
    ["Shipping Charge", money(report.summary.shippingCharge)],
    ["Discount", money(report.summary.discount)],
    ["Total Revenue", money(report.summary.totalAmount)],
  ];

  const summaryTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: summaryRows.map(
      ([metric, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: metric, bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [new Paragraph(value)],
            }),
          ],
        }),
    ),
  });

  const orderHeader = new TableRow({
    children: [
      "Order Number",
      "Customer",
      "Status",
      "Payment",
      "Items",
      "Amount",
      "Date",
    ].map(
      (heading) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: heading, bold: true })],
            }),
          ],
        }),
    ),
  });

  const orderRows = report.rows.map(
    (row) =>
      new TableRow({
        children: [
          row.orderNumber,
          row.customerName,
          row.orderStatus,
          `${row.paymentMethod} / ${row.paymentStatus}`,
          String(row.itemCount),
          money(row.totalAmount),
          dateText(row.createdAt),
        ].map(
          (value) =>
            new TableCell({
              children: [new Paragraph(String(value || ""))],
            }),
        ),
      }),
  );

  const ordersTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [orderHeader, ...orderRows],
  });

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Sales Report",
            heading: HeadingLevel.TITLE,
          }),

          new Paragraph({
            text: "Summary",
            heading: HeadingLevel.HEADING_1,
          }),

          summaryTable,

          new Paragraph({
            text: "Orders",
            heading: HeadingLevel.HEADING_1,
          }),

          ordersTable,
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
};