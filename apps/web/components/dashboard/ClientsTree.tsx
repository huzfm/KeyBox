import CreateBillDialog from "./CreateBillDialog";

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
  User,
  FileText,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";

type LicenseStatus = "ACTIVE" | "PENDING" | "REVOKED" | "EXPIRED";

interface License {
  _id: string;
  key: string;
  services?: string;
  status: LicenseStatus;
  duration: number;
  issuedAt: string | Date;
  expiresAt: string | Date;
}

interface Project {
  _id: string;
  name: string;
  licenses?: License[];
}

interface Client {
  _id: string;
  name: string;
  email?: string;
  projects?: Project[];
}

interface ClientsTreeProps {
  clients: Client[];
  onToggle: (key: string) => void | Promise<void>;
}

export default function ClientsTree({ clients, onToggle }: ClientsTreeProps) {
  const [isTogglingKey, setIsTogglingKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [billingClient, setBillingClient] = useState<Client | null>(null);

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
      case "EXPIRED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const isToggleable = (status: LicenseStatus) => {
    return status === "ACTIVE" || status === "REVOKED";
  };

  const getExpiryStyle = (
    issuedAt: string | Date,
    expiresAt: string | Date,
  ) => {
    const start = new Date(issuedAt).getTime();
    const end = new Date(expiresAt).getTime();
    const now = new Date().getTime();

    const total = end - start;
    const remaining = end - now;
    const percentage = (remaining / total) * 100;

    if (percentage > 80) {
      return {
        container: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        label: "text-emerald-500/70",
        value: "text-emerald-300",
      };
    } else if (percentage >= 30) {
      return {
        container: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        label: "text-amber-500/70",
        value: "text-amber-300",
      };
    } else {
      return {
        container:
          "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse",
        label: "text-rose-500/70",
        value: "text-rose-300",
      };
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {clients.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
                <div className="relative">
                  <div className="absolute right-16 top-1/2 -translate-y-1/2 z-20">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-slate-600 hover:bg-slate-700 text-slate-300 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBillingClient(client);
                      }}
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-2" />
                      Bill
                    </Button>
                  </div>
                  <AccordionTrigger asChild>
                    <button className="w-full">
                      <CardContent className="pt-6 pb-6 w-full">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <div className="p-2 rounded-lg shrink-0">
                              <User className="h-10 w-10 border-2 border-white rounded-md p-2 text-white" />
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
                </div>

                <AccordionContent className="pt-0 pb-6 px-6">
                  <div className="space-y-4">
                    {client.projects && client.projects.length > 0 ? (
                      client.projects.map((project) => (
                        <Card
                          key={project._id}
                          className="border-slate-700/50 bg-slate-700/30 backdrop-blur-sm overflow-hidden"
                        >
                          <CardHeader className="pb-4 border-b border-slate-700/30">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                <CardTitle className="text-sm font-semibold text-white">
                                  {project.name}
                                </CardTitle>
                              </div>
                              {project.licenses &&
                                project.licenses.length > 0 &&
                                (() => {
                                  const firstLicense = project.licenses[0];

                                  if (firstLicense.status === "PENDING") {
                                    return (
                                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded border shadow-sm bg-slate-800/50 border-slate-700/50 text-slate-400">
                                        <span className="font-semibold text-slate-500">
                                          Status:
                                        </span>
                                        <span className="font-mono font-bold text-slate-300">
                                          Starts on Activation (
                                          {firstLicense.duration} Months)
                                        </span>
                                      </div>
                                    );
                                  }

                                  if (firstLicense.status === "EXPIRED") {
                                    return (
                                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded border shadow-sm bg-rose-500/10 border-rose-500/30 text-rose-400">
                                        <span className="font-mono font-bold text-rose-300">
                                          License Has Been Expired
                                        </span>
                                      </div>
                                    );
                                  }

                                  const styles = getExpiryStyle(
                                    firstLicense.issuedAt,
                                    firstLicense.expiresAt,
                                  );
                                  return (
                                    <div
                                      className={`flex items-center gap-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded border shadow-sm transition-colors duration-500 ${styles.container}`}
                                    >
                                      <span
                                        className={`font-semibold ${styles.label}`}
                                      >
                                        Expires:
                                      </span>
                                      <span
                                        className={`font-mono font-bold ${styles.value}`}
                                      >
                                        {formatDate(firstLicense.expiresAt)}
                                      </span>
                                    </div>
                                  );
                                })()}
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
                                        <td className="py-4 px-4">
                                          <div className="flex flex-wrap gap-1.5">
                                            {license.services ? (
                                              (Array.isArray(license.services)
                                                ? license.services
                                                : license.services
                                                    .split(",")
                                                    .map((s: string) =>
                                                      s.trim(),
                                                    )
                                              ).map((service: string) => (
                                                <span
                                                  key={service}
                                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/50 text-slate-200 border border-slate-500/30"
                                                >
                                                  {service}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-slate-500 text-xs">
                                                No services
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="py-4 px-4">
                                          <Badge
                                            variant="outline"
                                            className={`${getStatusColor(
                                              license.status,
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
                                          {isToggleable(license.status) ? (
                                            <button
                                              onClick={() =>
                                                handleToggle(license.key)
                                              }
                                              disabled={
                                                isTogglingKey === license.key
                                              }
                                              className={`group relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                                                isTogglingKey === license.key
                                                  ? "opacity-60 cursor-wait"
                                                  : "hover:opacity-90"
                                              } ${
                                                license.status === "ACTIVE"
                                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] focus-visible:ring-emerald-500"
                                                  : "bg-gradient-to-r from-slate-600 to-slate-500 shadow-inner focus-visible:ring-slate-400"
                                              }`}
                                              title={
                                                license.status === "ACTIVE"
                                                  ? "Click to revoke"
                                                  : "Click to activate"
                                              }
                                              aria-label={
                                                license.status === "ACTIVE"
                                                  ? "Revoke license"
                                                  : "Activate license"
                                              }
                                            >
                                              <span
                                                className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out ${
                                                  license.status === "ACTIVE"
                                                    ? "translate-x-5"
                                                    : "translate-x-0.5"
                                                } ${
                                                  isTogglingKey === license.key
                                                    ? ""
                                                    : "group-hover:shadow-xl"
                                                }`}
                                              >
                                                {isTogglingKey ===
                                                  license.key && (
                                                  <span className="absolute inset-0 flex items-center justify-center">
                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                                  </span>
                                                )}
                                              </span>
                                            </button>
                                          ) : (
                                            <div className="inline-flex items-center gap-2">
                                              <span
                                                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-700/50 opacity-50 cursor-not-allowed`}
                                              >
                                                <span className="pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-slate-400 shadow" />
                                              </span>
                                              <span className="text-xs text-slate-500">
                                                {license.status === "PENDING"
                                                  ? "Pending"
                                                  : "Expired"}
                                              </span>
                                            </div>
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
      <CreateBillDialog
        client={billingClient}
        isOpen={!!billingClient}
        onOpenChange={(open) => !open && setBillingClient(null)}
      />
    </div>
  );
}
