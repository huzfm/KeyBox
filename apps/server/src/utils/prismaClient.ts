import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
try {
await prisma.$connect();
console.log("✅ Successfully connected to PostgreSQL via Prisma!");
} catch (err) {
console.error("❌ Failed to connect to PostgreSQL:", err);
}
}

testConnection();

export default prisma;