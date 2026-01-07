"use client";

import {
  useCreateClient,
  useCreateProject,
  useDashboard,
  useToggleLicense,
} from "@/lib/queries";
import CreateClient from "@/components/dashboard/CreateClient";
import CreateProject from "@/components/dashboard/CreateProject";
import ClientsTree from "@/components/dashboard/ClientsTree";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid } from "lucide-react";

export default function DashboardClient() {
  const { data: clients = [], isLoading } = useDashboard();
  const createClient = useCreateClient();
  const createProject = useCreateProject();
  const toggleLicense = useToggleLicense();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your clients, projects, and licenses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Create Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreateClient onCreate={createClient.mutate} />
            <CreateProject clients={clients} onCreate={createProject.mutate} />
          </div>

          {/* Clients List Section */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Clients & Projects</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {isLoading
                  ? "Loading your clients..."
                  : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : (
              <ClientsTree clients={clients} onToggle={toggleLicense.mutate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
