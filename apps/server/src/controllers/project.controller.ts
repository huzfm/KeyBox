import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/jwt";
import { Client } from "../models/Client";
import { Project } from "../models/Project";
import { License, Status } from "../models/License";
import { generateKey } from "../utils/genratekey";

export const createProjectWithLicense = async (
  req: AuthRequest,
  res: Response
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { clientId, projectName, duration, services } = req.body;

    if (!clientId || !projectName)
      return res
        .status(400)
        .json({ message: "Client ID & Project name required" });

    if (!duration || duration < 1 || duration > 12)
      return res.status(400).json({ message: "Invalid duration" });

    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    // 1️⃣ Validate Client
    const client = await Client.findById(clientId).session(session);
    if (!client) return res.status(404).json({ message: "Client not found" });

    // 2️⃣ Create Project
    const project = await Project.create(
      [
        {
          name: projectName,
          client: client._id,
        },
      ],
      { session }
    );

    // 3️⃣ Create License
    const issuedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(issuedAt.getMonth() + duration);

    const licenseKey = generateKey(project[0]._id.toString());

    const license = await License.create(
      [
        {
          key: licenseKey,
          duration,
          issuedAt,
          expiresAt,
          services,
          status: Status.PENDING,
          user: req.userId,
          client: client._id,
          project: project[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Project and License created successfully",
      project: project[0],
      license: license[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      message: "Failed to create project and license",
      error: (error as Error).message,
    });
  }
};
