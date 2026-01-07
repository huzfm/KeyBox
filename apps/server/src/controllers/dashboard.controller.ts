import { Response } from "express";
import { AuthRequest } from "../middleware/jwt";
import { Client } from "../models/Client";
import { Project } from "../models/Project";
import { License } from "../models/License";

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId; // ✅ from JWT
    const { clientId } = req.body; // ✅ optional filter from body

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1️⃣ Fetch clients of user (or single client)
    const clientQuery: any = { owner: userId };
    if (clientId) clientQuery._id = clientId;

    const clients = await Client.find(clientQuery).lean();

    // 2️⃣ Fetch projects for those clients
    const clientIds = clients.map((c) => c._id);
    const projects = await Project.find({
      client: { $in: clientIds },
    }).lean();

    // 3️⃣ Fetch licenses for those projects
    const projectIds = projects.map((p) => p._id);
    const licenses = await License.find({
      project: { $in: projectIds },
    }).lean();

    // 4️⃣ Build nested response
    const dashboard = clients.map((client) => {
      const clientProjects = projects
        .filter((p) => p.client.toString() === client._id.toString())
        .map((project) => ({
          ...project,
          licenses: licenses.filter(
            (l) => l.project.toString() === project._id.toString()
          ),
        }));

      return {
        ...client,
        projects: clientProjects,
      };
    });

    return res.json({
      message: "Dashboard fetched successfully",
      clientsCount: dashboard.length,
      projectsCount: projects.length,
      data: dashboard,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch dashboard",
      error: (error as Error).message,
    });
  }
};
