"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { signupUser } from "@/app/api/auth";
import type { AxiosError } from "axios";
import { UserPlus } from "lucide-react";

type APIError = {
  message?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: signupUser,
    onSuccess: () => {
      setMsg("Account created! Redirecting...");
      setTimeout(() => router.push("/login"), 0);
    },
    onError: (err: AxiosError<APIError>) => {
      setMsg(err.response?.data?.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (form.password !== form.confirmPassword) {
      return setMsg("Passwords do not match");
    }

    mutate(form);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[35px_35px]" />

      <div className="relative z-10 flex min-h-screen">
        {/* LEFT SIDE — STATIC VISUAL */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-8">
          <div className="relative flex flex-col items-center gap-8">
            {/* Glow */}
            <div className="absolute w-80 h-80 bg-primary/25 rounded-full blur-3xl" />

            {/* Icon */}
            <UserPlus className="w-32 h-32 text-white relative z-10" />

            {/* Text */}
            <div className="relative z-10 text-center space-y-2">
              <p className="text-4xl font-semibold text-white">
                Create your account
              </p>
              <p className="text-muted-foreground text-xl">
                Start managing licenses securely and effortlessly
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — SIGNUP FORM */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-0">
          <div className="w-full max-w-md bg-white rounded-2xl">
            <form
              onSubmit={handleSubmit}
              className="border border-border/50 bg-card/40 backdrop-blur-md rounded-2xl p-8 space-y-3 shadow-2xl"
            >
              <h1 className="text-2xl font-bold text-black text-center">
                Create an Account
              </h1>

              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-black p-3 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-black p-3 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  placeholder="********"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-black p-3 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Confirm Password</label>
                <input
                  type="password"
                  placeholder="********"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-black p-3 bg-muted/30 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Account"}
              </button>

              {msg && (
                <p
                  className={`text-center text-sm font-medium ${
                    msg.includes("") ? "text-black-600" : "text-red-600"
                  }`}
                >
                  {msg}
                </p>
              )}

              <p className="text-center text-sm text-black font-semibold">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-primary font-semibold hover:underline"
                >
                  Log in
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
