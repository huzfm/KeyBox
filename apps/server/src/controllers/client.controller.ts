import { Response } from "express";
import { Client } from "../models/Client";
import { AuthRequest } from "../middleware/jwt";

export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const { name ,email } = req.body;

    if (!name){
      return res.status(400).json({ message: "Client name required" });
    } 
    if(!email){
      return res.status(400).json({ message: "Client email required" });
    }

    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const client = await Client.create({
      name,
      email,
      owner: req.userId,
    });

    res.status(201).json({
      message: "Client created successfully",
      client,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
