import crypto from "crypto";

export function generateKey(product: string) {
  const random = () => crypto.randomBytes(2).toString("hex").toUpperCase(); // 4 characters

  const prefix = product.slice(0, 3).toUpperCase();
  return `${prefix}-${random()}-${random()}-${random()}`;
}
