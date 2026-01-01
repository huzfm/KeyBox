"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/app/api/auth";
import type { AxiosError } from "axios";
import Cookies from "js-cookie"; // <-- add this

type APIError = {
  message?: string;
  token?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string>("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: (data: { token: string }) => {
      // 🔐 Store JWT in cookies for later use
      Cookies.set("jwt", data.token, {
        expires: 7, // cookie valid for 7 days
        secure: true, // send only over https (keep if production)
        sameSite: "strict",
      });

      setMsg("🎉 Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1200);
    },
    onError: (err: AxiosError<APIError>) => {
      setMsg(err.response?.data?.message || "❌ Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    mutate(form);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white shadow-md rounded-xl p-8 space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">Welcome Back</h1>

        <div>
          <label className="block text-gray-700 font-medium">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="mt-2 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium">Password</label>
          <input
            type="password"
            placeholder="********"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            className="mt-2 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isPending ? "Logging in..." : "Log In"}
        </button>

        {msg && (
          <p
            className={`text-center font-medium mt-2 ${
              msg.includes("🎉") ? "text-green-600" : "text-red-600"
            }`}
          >
            {msg}
          </p>
        )}

        <p className="text-center text-gray-600 text-sm">
          Dont have an account?{" "}
          <a
            href="/signup"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
