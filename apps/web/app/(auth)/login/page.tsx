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

              {/* DIVIDER */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-black/60">Or continue with</span>
                </div>
              </div>

              {/* GOOGLE SIGN-IN BUTTON */}
              <a
                href="http://localhost:5000/auth/google"
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border-2 border-black bg-white text-black font-semibold hover:bg-black/5 active:scale-95 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </a>

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
