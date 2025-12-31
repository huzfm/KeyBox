import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Role } from "../models/User";

interface SignupBody {
  email: string;
  password: string;
  confirm_password: string;
  company_name?: string;
}
interface LoginBody {
  email: string;
  password: string;
}

export const signup = async (req: Request<SignupBody>, res: Response) => {
  try {
    const { name, email, password, confirm_password } = req.body;

    if (!name || !email || !password || !confirm_password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const alreadyExists = await User.findOne({ email });
    if (alreadyExists) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash: hashedPassword,
      role: Role.DEVELOPER,
    });

    return res.status(201).json({
      message: "Signup successful",
      userId: user._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Signup failed",
      error: (error as Error).message,
    });
  }
};

export const login = async (req: Request<LoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        error: "User not found",
      });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(400).json({
        error: "Invalid credentials",
      });

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "defaultsecret",
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful",
      user: user.email,
      token,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error: (error as Error).message,
    });
  }
};
