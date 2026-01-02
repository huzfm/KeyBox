"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import type { AxiosError } from "axios";
import { Lock, LockOpen, Key, Mail } from "lucide-react";
import { loginUser } from "@/app/api/auth";

type APIError = {
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: (data: { token: string }) => {
      Cookies.set("jwt", data.token, {
        expires: 7,
        secure: true,
        sameSite: "strict",
      });
      setMsg("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1200);
    },
    onError: (err: AxiosError<APIError>) => {
      setMsg(err.response?.data?.message || "Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    mutate(form);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:35px_35px]" />

      <div className="relative z-10 flex min-h-screen">
        {/* LEFT SIDE — ONE-TIME UNLOCK */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-8">
          <OneTimeUnlock />
        </div>

        {/* RIGHT SIDE — LOGIN FORM */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <form
              onSubmit={handleSubmit}
              className="border border-border/50 bg-card/40 backdrop-blur-md rounded-2xl p-8 space-y-6 shadow-2xl"
            >
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome Back
                </h1>
                <p className="text-muted-foreground text-sm mt-2">
                  Enter your credentials to continue
                </p>
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/50 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/50 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 active:scale-95 transition"
              >
                {isPending ? "Logging in..." : "Log In"}
              </button>

              {msg && (
                <p
                  className={`text-center text-sm p-3 rounded-lg ${
                    msg.includes("successful")
                      ? "bg-green-500/20 text-green-400"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {msg}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes lockIdle {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes keyInsert {
          0% { transform: translateY(-90px); opacity: 0; }
          30% { opacity: 1; }
          55% { transform: translateY(0); opacity: 1; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes unlock {
          0%,60% { opacity: 0; transform: scale(0.9); }
          75% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }

        .animate-lock { animation: lockIdle 4s ease-in-out forwards; }
        .animate-key { animation: keyInsert 4s ease-in-out forwards; }
        .animate-unlock { animation: unlock 4s ease-in-out forwards; }
      `}</style>
    </div>
  );
}

/* ---------------- ONE-TIME UNLOCK COMPONENT ---------------- */

function OneTimeUnlock() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setUnlocked(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="absolute w-72 h-72 bg-primary/25 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {!unlocked && (
            <>
              <Lock className="absolute w-24 h-24 text-primary animate-lock" />
              <Key className="absolute w-14 h-14 text-white animate-key" />
              <LockOpen className="absolute w-24 h-24 text-primary animate-unlock" />
            </>
          )}

          {unlocked && (
            <LockOpen className="w-24 h-24 text-primary drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
          )}
        </div>

        <p className="text-muted-foreground text-lg tracking-wide">
          {unlocked ? "License Activated" : "Activating License"}
        </p>
      </div>
    </div>
  );
}
