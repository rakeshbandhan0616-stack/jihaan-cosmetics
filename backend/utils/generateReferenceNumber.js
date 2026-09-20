import crypto from "node:crypto";

export function generateReferenceNumber(type) {
  const prefix = type === "seller" ? "SELL" : "LOGI";

  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomCode = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `JHN-${prefix}-${date}-${randomCode}`;
}