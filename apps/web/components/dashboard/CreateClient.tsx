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
import { Plus } from "lucide-react";

interface CreateClientProps {
  onCreate: (name: string) => void;
}

export default function CreateClient({ onCreate }: CreateClientProps) {
  const [name, setName] = useState<string>("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name);
    setName("");
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Client
        </CardTitle>
        <CardDescription>Add a new client to your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            placeholder="Enter client name"
            value={name}
            onChange={(e) =>
              setName((e.currentTarget as unknown as { value: string }).value)
            }
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-muted/50 border-border/50"
          />
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
