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
import { toast } from "sonner";

interface Client {
       _id: string;
       name: string;
}

interface CreateProjectData {
       clientId: string;
       projectName: string;
       duration: number;
       services: string[];
}

interface CreateProjectProps {
       clients: Client[];
       onCreate: (data: CreateProjectData) => Promise<void> | void;
}

const AVAILABLE_SERVICES = ["Hosting", "Domain"] as const;

export default function CreateProject({
       clients,
       onCreate,
}: CreateProjectProps) {
       const [clientId, setClientId] = useState<string>("");
       const [projectName, setProjectName] = useState<string>("");
       const [duration, setDuration] = useState<number | "">("");
       const [services, setServices] = useState<string[]>(["Hosting"]);
       const [isCreating, setIsCreating] = useState<boolean>(false);

       const toggleService = (service: string) => {
              setServices((prev) =>
                     prev.includes(service)
                            ? prev.filter((s) => s !== service)
                            : [...prev, service],
              );
       };

       const handleCreate = async () => {
              const durationNum =
                     typeof duration === "number"
                            ? duration
                            : parseInt(String(duration));
              if (
                     !clientId ||
                     !projectName.trim() ||
                     !durationNum ||
                     isNaN(durationNum)
              )
                     return;

              setIsCreating(true);
              try {
                     await onCreate({
                            clientId,
                            projectName,
                            duration: durationNum,
                            services,
                     });
                     toast.success("Project created successfully!");
                     setProjectName("");
                     setDuration("");
              } catch (error) {
                     toast.error("Failed to create project");
              } finally {
                     setIsCreating(false);
              }
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
                                   <Select
                                          value={clientId}
                                          onValueChange={setClientId}
                                   >
                                          <SelectTrigger className="bg-muted/50 border-border/50">
                                                 <SelectValue placeholder="Select a client" />
                                          </SelectTrigger>
                                          <SelectContent>
                                                 {clients.map((c) => (
                                                        <SelectItem
                                                               key={c._id}
                                                               value={c._id}
                                                        >
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
                                                        (
                                                               e.currentTarget as unknown as {
                                                                      value: string;
                                                               }
                                                        ).value,
                                                 )
                                          }
                                          className="bg-muted/50 border-border/50"
                                   />

                                   <Input
                                          type="number"
                                          min={1}
                                          max={12}
                                          value={duration}
                                          onChange={(e) => {
                                                 const value = Number(
                                                        (
                                                               e.currentTarget as unknown as {
                                                                      value: string;
                                                               }
                                                        ).value,
                                                 );

                                                 if (value > 12) {
                                                        setDuration(12);
                                                 } else if (
                                                        value < 1 &&
                                                        value !== 0
                                                 ) {
                                                        setDuration(1);
                                                 } else {
                                                        setDuration(value);
                                                 }
                                          }}
                                          className="bg-muted/50 border-border/50"
                                          placeholder="Duration in months"
                                   />
                            </div>
                            {duration &&
                                   typeof duration === "number" &&
                                   duration > 0 && (
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/30 w-fit mx-auto animate-in fade-in slide-in-from-top-1">
                                                 <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                 <span>
                                                        License will expire on:
                                                 </span>
                                                 <span className="font-semibold text-foreground">
                                                        {new Date(
                                                               new Date().setMonth(
                                                                      new Date().getMonth() +
                                                                             duration,
                                                               ),
                                                        ).toLocaleDateString(
                                                               "en-US",
                                                               {
                                                                      year: "numeric",
                                                                      month: "long",
                                                                      day: "numeric",
                                                               },
                                                        )}
                                                 </span>
                                          </div>
                                   )}

                            <div className="flex flex-col items-center gap-3">
                                   <span className="text-sm text-muted-foreground">
                                          Services:
                                   </span>
                                   <div className="flex gap-2">
                                          {AVAILABLE_SERVICES.map((service) => {
                                                 const isSelected =
                                                        services.includes(
                                                               service,
                                                        );
                                                 return (
                                                        <button
                                                               key={service}
                                                               type="button"
                                                               onClick={() =>
                                                                      toggleService(
                                                                             service,
                                                                      )
                                                               }
                                                               className={`
                    relative px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 ease-out
                    border-2 
                    ${
                           isSelected
                                  ? "bg-slate-100 text-black"
                                  : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
                    }
                  `}
                                                        >
                                                               <span className="flex items-center gap-2">
                                                                      {isSelected && (
                                                                             <svg
                                                                                    className="w-4 h-4"
                                                                                    fill="none"
                                                                                    viewBox="0 0 24 24"
                                                                                    stroke="currentColor"
                                                                             >
                                                                                    <path
                                                                                           strokeLinecap="round"
                                                                                           strokeLinejoin="round"
                                                                                           strokeWidth={
                                                                                                  2
                                                                                           }
                                                                                           d="M5 13l4 4L19 7"
                                                                                    />
                                                                             </svg>
                                                                      )}
                                                                      {service}
                                                               </span>
                                                        </button>
                                                 );
                                          })}
                                   </div>

                                   <Button
                                          onClick={handleCreate}
                                          disabled={
                                                 !clientId ||
                                                 !projectName.trim() ||
                                                 services.length === 0 ||
                                                 isCreating
                                          }
                                          className="mx-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                                   >
                                          {isCreating
                                                 ? "Creating..."
                                                 : "Create Project & License"}
                                   </Button>
                            </div>
                     </CardContent>
              </Card>
       );
}
