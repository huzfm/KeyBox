"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus } from "lucide-react";

/* ---------------- TYPES ---------------- */

interface Client {
  _id: string;
  name: string;
}

interface CreateProjectData {
  clientId: string;
  projectName: string;
  duration: number;
  services: string;
}

interface CreateProjectProps {
  clients: Client[];
  onCreate: (data: CreateProjectData) => void;
}

/* ---------------- COMPONENT ---------------- */

export default function CreateProject({
  clients,
  onCreate,
}: CreateProjectProps) {
  const [clientId, setClientId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [duration, setDuration] = useState<number>(12);
  const [services, setServices] = useState<string>("Hosting");

  const handleCreate = () => {
    if (!clientId || !projectName.trim()) return;
    onCreate({ clientId, projectName, duration, services });
    setProjectName("");
    setDuration(12);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" />
          Create Project & License
        </CardTitle>
        <CardDescription>
          Create a new project with associated license
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="bg-muted/50 border-border/50">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Project name"
            value={projectName}
            onChange={(e) =>
              setProjectName(
                (e.currentTarget as unknown as { value: string }).value
              )
            }
            className="bg-muted/50 border-border/50"
          />

          <Input
            type="number"
            min={1}
            max={12}
            value={duration}
            onChange={(e) =>
              setDuration(
                Number((e.currentTarget as unknown as { value: string }).value)
              )
            }
            className="bg-muted/50 border-border/50"
            placeholder="Duration"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={services} onValueChange={setServices}>
            <SelectTrigger className="bg-muted/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hosting">Hosting</SelectItem>
              <SelectItem value="Domain">Domain</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleCreate}
            disabled={!clientId || !projectName.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground col-span-2"
          >
            Create Project & License
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
