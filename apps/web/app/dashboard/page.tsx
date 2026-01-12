"use client";

import { useMemo, useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Mail, ShieldX, KeyRound } from "lucide-react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardClient() {
  const { data: clients = [], isLoading } = useDashboard();
  const createClient = useCreateClient();
  const createProject = useCreateProject();
  const toggleLicense = useToggleLicense();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  const isAuthorized = useMemo(() => {
    const jwt = Cookies.get("jwt");
    return !!jwt;
  }, []);

  const userInfo = useMemo(() => {
    try {
      const jwt = Cookies.get("jwt");
      if (!jwt) return { name: null, email: null };
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      return {
        name: payload.name || payload.username || null,
        email: payload.email || payload.sub || null,
      };
    } catch {
      return { name: null, email: null };
    }
  }, []);

  useEffect(() => {
    setIsChecking(false);
  }, []);

  const handleLogout = () => {
    Cookies.remove("jwt");
    router.push("/login");
  };

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  // Show unauthorized UI if no JWT
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background relative flex items-center justify-center">
        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:35px_35px]" />
        
        <div className="relative z-10 text-center px-4">
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Access Denied
          </h1>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            You need to be logged in to access the dashboard. Please sign in with your developer account.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-slate-200 font-medium px-6">
                Log In
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:35px_35px]" />
      
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl lg:text-3xl font-bold tracking-tight font-mono ring-1 ring-white/20 bg-black rounded-lg sm:rounded-2xl px-2 py-1.5 sm:px-3 sm:py-2 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 inline-block truncate max-w-full">
                KeyBox
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 hidden sm:block">
                Manage your clients, projects, and licenses
              </p>
            </div>

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 font-medium text-sm hover:bg-slate-600 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-500">
                  {userInfo.email ? userInfo.email.charAt(0).toUpperCase() : "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
                {/* Email Display */}
                <div className="px-3 py-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Signed in as</p>
                  <p className="text-sm text-white font-medium mt-0.5 truncate">
                    {userInfo.email || "user@example.com"}
                  </p>
                </div>
                
                <DropdownMenuSeparator className="bg-slate-700 my-1" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 mx-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Create Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CreateClient onCreate={createClient.mutateAsync} />
            <CreateProject clients={clients} onCreate={createProject.mutateAsync} />
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
