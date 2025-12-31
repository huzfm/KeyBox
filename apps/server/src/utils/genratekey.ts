import crypto from "crypto";

export function generateKey(product: string) {
  const random = () => crypto.randomBytes(2).toString("hex").toUpperCase();

  const prefix = product.slice(0, 3).toUpperCase();
  return `${prefix}-${random()}-${random()}-${random()}`;
}
