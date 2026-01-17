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
  } catch (error: any) {
    console.error("Error creating client:", error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors,
        details: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Client with this email already exists",
        field: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({ 
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
