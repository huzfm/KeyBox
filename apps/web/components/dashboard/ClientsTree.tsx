"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  FileText,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";

/* ---------------- TYPES ---------------- */

type LicenseStatus = "ACTIVE" | "PENDING" | "REVOKED";

interface License {
  _id: string;
  key: string;
  services?: string;
  status: LicenseStatus;
}

interface Project {
  _id: string;
  name: string;
  licenses?: License[];
}

interface Client {
  _id: string;
  name: string;
  projects?: Project[];
}

interface ClientsTreeProps {
  clients: Client[];
  onToggle: (key: string) => void | Promise<void>;
}

/* ---------------- COMPONENT ---------------- */

export default function ClientsTree({ clients, onToggle }: ClientsTreeProps) {
  const [isTogglingKey, setIsTogglingKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleToggle = async (licenseKey: string) => {
    setIsTogglingKey(licenseKey);
    try {
      await onToggle(licenseKey);
    } finally {
      setIsTogglingKey(null);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = (key: string) => {
    const nav = (
      globalThis as unknown as {
        navigator?: {
          clipboard?: {
            writeText: (text: string) => Promise<void>;
          };
        };
      }
    ).navigator;

    nav?.clipboard?.writeText(key);

    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "PENDING":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "REVOKED":
        return "bg-red-500/10 text-white border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {clients.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
            <p className="text-muted-foreground text-sm">
              Create your first client to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {clients.map((client) => (
            <AccordionItem
              key={client._id}
              value={client._id}
              className="border-0"
            >
              <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
                <AccordionTrigger asChild>
                  <button className="w-full">
                    <CardContent className="pt-6 pb-6 w-full">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="p-2 bg-blue-600/20 rounded-lg shrink-0">
                            <Building2 className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base text-white">
                              {client.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              {client.projects?.length || 0} project
                              {client.projects?.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-slate-400 shrink-0 transition-transform" />
                      </div>
                    </CardContent>
                  </button>
                </AccordionTrigger>

                <AccordionContent className="pt-0 pb-6 px-6">
                  <div className="space-y-4">
                    {client.projects && client.projects.length > 0 ? (
                      client.projects.map((project) => (
                        <Card
                          key={project._id}
                          className="border-slate-700/50 bg-slate-700/30 backdrop-blur-sm overflow-hidden"
                        >
                          <CardHeader className="pb-4 border-b border-slate-700/30">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                              <CardTitle className="text-sm font-semibold text-white">
                                {project.name}
                              </CardTitle>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0">
                            {project.licenses && project.licenses.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="border-b border-slate-700/50">
                                    <tr>
                                      <th className="text-left py-3 px-4 text-slate-300">
                                        License Key
                                      </th>
                                      <th className="text-left py-3 px-4 text-slate-300">
                                        Services
                                      </th>
                                      <th className="text-left py-3 px-4 text-slate-300">
                                        Status
                                      </th>
                                      <th className="text-right py-3 px-4 text-slate-300">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {project.licenses.map((license) => (
                                      <tr
                                        key={license._id}
                                        className="border-t border-slate-700/30"
                                      >
                                        <td className="py-4 px-4">
                                          <div className="flex items-center gap-2">
                                            <code className="font-mono text-xs bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                                              {visibleKeys[license._id]
                                                ? license.key
                                                : license.key.substring(0, 8) +
                                                  "••••••••"}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                toggleKeyVisibility(license._id)
                                              }
                                              className="h-6 w-6 p-0"
                                            >
                                              {visibleKeys[license._id] ? (
                                                <EyeOff size={14} />
                                              ) : (
                                                <Eye size={14} />
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleCopyKey(license.key)
                                              }
                                              className="h-6 w-6 p-0"
                                            >
                                              {copiedKey === license.key ? (
                                                <Check
                                                  size={14}
                                                  className="text-emerald-500"
                                                />
                                              ) : (
                                                <Copy size={14} />
                                              )}
                                            </Button>
                                          </div>
                                        </td>
                                        <td className="py-4 px-4 text-slate-300">
                                          {license.services || "-"}
                                        </td>
                                        <td className="py-4 px-4">
                                          <Badge
                                            variant="outline"
                                            className={`${getStatusColor(
                                              license.status
                                            )} capitalize text-xs`}
                                          >
                                            {license.status === "PENDING" && (
                                              <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                            )}
                                            {license.status === "ACTIVE" && (
                                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                            )}
                                            {license.status === "REVOKED" && (
                                              <XCircle className="h-2.5 w-2.5 mr-1" />
                                            )}
                                            {license.status}
                                          </Badge>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                          {license.status !== "PENDING" ? (
                                            <Button
                                              onClick={() =>
                                                handleToggle(license.key)
                                              }
                                              disabled={
                                                isTogglingKey === license.key
                                              }
                                              variant={
                                                license.status === "ACTIVE"
                                                  ? "destructive"
                                                  : "default"
                                              }
                                              size="sm"
                                              className="text-xs text-white hover:text-white"
                                            >
                                              {isTogglingKey === license.key ? (
                                                "Loading..."
                                              ) : license.status ===
                                                "ACTIVE" ? (
                                                <>
                                                  <XCircle className="h-3 w-3 mr-1" />
                                                  Revoke
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                                  Activate
                                                </>
                                              )}
                                            </Button>
                                          ) : (
                                            <span className="text-xs text-slate-400 italic">
                                              License not activated yet
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">No licenses yet</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        <p className="text-sm">No projects yet</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
