"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  Eye,
  EyeOff,
  Plus,
  LogOut,
  MoreVertical,
  Copy,
  Check,
} from "lucide-react";

import { useDashboard } from "../hooks/useDashboard";
import { useCreateLicense } from "../hooks/useCreateLicense";
import { useToggleLicense } from "../hooks/useToggleLicense";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* ---------------- TYPES ---------------- */

type LicenseData = {
  _id: string;
  key: string;
  productName: string;
  customer: string;
  duration: number;
  status: "active" | "revoked" | "expired";
};

/* ---------------- PAGE ---------------- */

export default function DashboardPage() {
  const router = useRouter();

  /* ---------------- HYDRATION SAFE AUTH ---------------- */

  const [token, setToken] = useState<string | null>(
    () => Cookies.get("jwt") ?? null
  );

  const userId = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode<{ userId?: string }>(token).userId ?? null;
    } catch {
      return null;
    }
  }, [token]);

  /* ---------------- UI STATE ---------------- */

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    productName: "",
    customer: "",
    duration: 1,
  });

  /* ---------------- DATA ---------------- */

  const { data, refetch, isLoading } = useDashboard();

  const { mutate: createLicense, isPending } = useCreateLicense(() => {
    setShowCreateModal(false);
    setForm({ productName: "", customer: "", duration: 1 });
    refetch();
  });

  const { mutate: toggleStatus, isPending: isToggling } =
    useToggleLicense(refetch);

  /* ---------------- HELPERS ---------------- */

  const licenses: LicenseData[] =
    data?.licenses?.map((l: LicenseData) => ({
      ...l,
      status: l.status.toLowerCase(),
    })) || [];

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const logout = () => {
    Cookies.remove("jwt");
    setToken(null);
    router.push("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "expired":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "revoked":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  /* ---------------- RENDER GATES ---------------- */

  if (!token || !userId) {
    router.push("/login");
    return null;
  }

  /* ---------------- UI ---------------- */

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size[35px_35px]" />

      <div className="relative z-10">
        {/* HEADER */}
        <header className="border-b border-slate-700/50 bg-black/80 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">KeyBox</h1>
              <p className="text-sm text-slate-400 mt-1">
                Manage and track your software licenses
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-slate-100 text-black"
                disabled={isPending}
              >
                <Plus size={16} />
                Create License
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white font-semibold">
                        {data?.user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-semibold text-sm">{data?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {data?.user?.email}
                    </p>
                  </div>
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Your Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">
                    Loading licenses...
                  </div>
                </div>
              ) : licenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No licenses created yet
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus size={16} />
                    Create your first license
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4">Product</th>
                        <th className="text-left py-3 px-4">Customer</th>
                        <th className="text-left py-3 px-4">License Key</th>
                        <th className="text-left py-3 px-4">Duration</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((lic) => (
                        <tr
                          key={lic._id}
                          className="border-t border-slate-700/30"
                        >
                          <td className="py-4 px-4 text-white">
                            {lic.productName}
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {lic.customer}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs bg-slate-700/50 px-2 py-1 rounded">
                                {visibleKeys[lic._id]
                                  ? lic.key
                                  : lic.key.substring(0, 8) + "••••••••"}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeyVisibility(lic._id)}
                              >
                                {visibleKeys[lic._id] ? (
                                  <EyeOff size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyKey(lic.key)}
                              >
                                {copiedKey === lic.key ? (
                                  <Check
                                    size={16}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </Button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {lic.duration} month
                            {lic.duration !== 1 && "s"}
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(
                                lic.status
                              )} capitalize`}
                            >
                              {lic.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isToggling}
                                >
                                  <MoreVertical size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => toggleStatus(lic.key)}
                                >
                                  {lic.status === "active"
                                    ? "Revoke License"
                                    : "Activate License"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Create New License</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createLicense(form);
            }}
          >
            <div>
              <Label>Product Name</Label>
              <Input
                value={form.productName}
                onChange={(e) =>
                  setForm({ ...form, productName: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Customer Name</Label>
              <Input
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Duration (Months)</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: Number(e.target.value) })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create License"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
