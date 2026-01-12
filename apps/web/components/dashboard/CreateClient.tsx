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
  onCreate: (name: string) => Promise<void> | void;
}

export default function CreateClient({ onCreate }: CreateClientProps) {
  const [name, setName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name);
      setName("");
    } finally {
      setIsCreating(false);
    }
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
        <div className="flex flex-col gap-3">
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
            disabled={!name.trim() || isCreating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
