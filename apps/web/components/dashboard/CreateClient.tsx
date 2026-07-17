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
import { toast } from "sonner";

interface CreateClientProps {
       onCreate: (data: {
              name: string;
              email: string;
       }) => Promise<void> | void;
}

export default function CreateClient({ onCreate }: CreateClientProps) {
       const [name, setName] = useState<string>("");
       const [email, setEmail] = useState<string>("");
       const [isCreating, setIsCreating] = useState<boolean>(false);

       const isValidEmail = (email: string): boolean => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(email);
       };

       const handleCreate = async () => {
              if (!name.trim() || !email.trim() || !isValidEmail(email)) return;
              setIsCreating(true);
              try {
                     await onCreate({ name, email });
                     toast.success("Client created successfully!");
                     setName("");
                     setEmail("");
              } catch (error) {
                     toast.error("Failed to create client");
              } finally {
                     setIsCreating(false);
              }
       };

       return (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                     <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                   <Plus className="h-5 w-5" />
                                   Create New Client
                            </CardTitle>
                            <CardDescription>
                                   Add a new client to your portfolio
                            </CardDescription>
                     </CardHeader>
                     <CardContent>
                            <div className="flex flex-col gap-3">
                                   <Input
                                          placeholder="Enter client name"
                                          value={name}
                                          onChange={(e) =>
                                                 setName(
                                                        (
                                                               e.currentTarget as unknown as {
                                                                      value: string;
                                                               }
                                                        ).value,
                                                 )
                                          }
                                          onKeyDown={(e) =>
                                                 e.key === "Enter" &&
                                                 handleCreate()
                                          }
                                          className="bg-zinc-900/70 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-violet-500/40"
                                   />
                                   <Input
                                          type="email"
                                          placeholder="Enter client email"
                                          value={email}
                                          onChange={(e) =>
                                                 setEmail(
                                                        (
                                                               e.currentTarget as unknown as {
                                                                      value: string;
                                                               }
                                                        ).value,
                                                 )
                                          }
                                          onKeyDown={(e) =>
                                                 e.key === "Enter" &&
                                                 handleCreate()
                                          }
                                          className={`bg-zinc-900/70 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-violet-500/40 ${
                                                 email && !isValidEmail(email)
                                                        ? "border-rose-500/60"
                                                        : ""
                                          }`}
                                   />
                                   {email && !isValidEmail(email) && (
                                          <p className="text-xs text-rose-400">
                                                 Please enter a valid email
                                                 address
                                          </p>
                                   )}
                                   <Button
                                          onClick={handleCreate}
                                          disabled={
                                                 !name.trim() ||
                                                 !email.trim() ||
                                                 !isValidEmail(email) ||
                                                 isCreating
                                          }
                                          className="bg-white text-black hover:bg-zinc-200 font-medium"
                                   >
                                          {isCreating
                                                 ? "Creating..."
                                                 : "Create"}
                                   </Button>
                            </div>
                     </CardContent>
              </Card>
       );
}
