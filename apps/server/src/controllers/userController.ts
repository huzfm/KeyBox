import { Request, Response } from "express";
import prisma from "../utils/prismaClient";

export const getUsers = async (req: Request, res: Response) => {
try {
const users = await prisma.user.findMany();
res.json(users);
} catch (err) {
console.error(err);
res.status(500).send("Server error");
}
};

export const createUser = async (req: Request, res: Response) => {
try {
const { name, email } = req.body;
const user = await prisma.user.create({
data: { name, email },
});
res.json(user);
} catch (err) {
console.error(err);
res.status(500).send("Server error");
}
};