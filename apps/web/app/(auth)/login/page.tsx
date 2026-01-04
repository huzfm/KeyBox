"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import type { AxiosError } from "axios";
import { Lock, LockOpen, Mail } from "lucide-react";
import { loginUser } from "@/app/api/auth";

/* ---------------- TYPES ---------------- */

type APIError = {
  message?: string;
};

/* ---------------- PAGE ---------------- */

export default function LoginPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [unlocked, setUnlocked] = useState(false);

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

      setUnlocked(true);
      setMsg("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 500);
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[35px_35px]" />

      <div className="relative z-10 flex min-h-screen">
        {/* LEFT SIDE — STATIC LOCK */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-8">
          <StaticLock unlock={unlocked} />
        </div>

        {/* RIGHT SIDE — LOGIN FORM */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <form
              onSubmit={handleSubmit}
              className=" bg-white
  shadow-[0_0_60px_rgba(255,255,255,0.45)] border border-black rounded-2xl p-8 space-y-6 "
            >
              <div>
                <h1 className="text-3xl font-bold text-black">Welcome Back</h1>
                <p className="text-black text-sm mt-2">
                  Enter your credentials to continue
                </p>
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* LOGIN BUTTON — BLUE */}
              <button
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 active:scale-95 transition"
              >
                {isPending ? "Logging in..." : "Log In"}
              </button>

              {msg && (
                <p className="text-center text-sm p-3 rounded-lg bg-black/10 text-black">
                  {msg}
                </p>
              )}

              {/* SIGN UP LINK — BLUE */}
              <p className="text-center text-sm text-black font-semibold mt-6">
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Sign up
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- STATIC LOCK COMPONENT ---------------- */

function StaticLock({ unlock }: { unlock: boolean }) {
  return (
    <div className="relative flex flex-col items-center gap-8">
      {/* Glow */}
      <div className="absolute w-80 h-80 bg-blue-600/30 rounded-full blur-3xl" />

      {/* Icon */}
      <div className="relative z-10">
        {unlock ? (
          <LockOpen className="w-40 h-40 text-white" />
        ) : (
          <Lock className="w-40 h-40 text-white" />
        )}
      </div>

      {/* Status */}
      <p className="relative z-10 text-3xl font-semibold tracking-wide text-white">
        {unlock ? "Unlocked" : "Locked"}
      </p>
    </div>
  );
}
