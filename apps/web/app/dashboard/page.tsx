"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type LicenseForm = {
  productName: string;
  customer: string;
  duration: number;
};

type APIError = {
  message?: string;
};

async function createLicenseRequest(form: LicenseForm) {
  const res = await fetch("http://localhost:5000/license/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${token}`,  // Uncomment later when using auth
    },
    body: JSON.stringify(form),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "❌ Failed to create license");
  return data;
}

export default function DashboardPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [msg, setMsg] = useState<string>("");

  const [form, setForm] = useState<LicenseForm>({
    productName: "",
    customer: "",
    duration: 1,
  });

  const update = (key: keyof LicenseForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: createLicenseRequest,
    onSuccess: (data) => {
      setMsg(`🎉 License Created! \n🔑 ${data.key}`);
      setForm({ productName: "", customer: "", duration: 1 });
    },
    onError: (err: AxiosError<APIError>) => {
      setMsg(
        err.message ||
          err.response?.data?.message ||
          "❌ Failed to create license"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    mutate(form);
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </header>

      <div className="max-w-xl mx-auto bg-white p-8 shadow-lg rounded-xl space-y-6 border">
        <h2 className="text-2xl font-bold text-blue-600">Create License Key</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-medium">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. MySoftware, SaaS CRM"
              value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
              className="w-full border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-medium">
              Customer (Name / Email / Company)
            </label>
            <input
              type="text"
              required
              placeholder="Customer"
              value={form.customer}
              onChange={(e) => update("customer", e.target.value)}
              className="w-full border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-medium">Duration (Months)</label>
            <input
              type="number"
              min={1}
              max={12}
              required
              value={form.duration}
              onChange={(e) => update("duration", Number(e.target.value))}
              className="w-full border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create License"}
          </button>
        </form>

        {msg && (
          <p
            className={`text-center text-lg font-semibold mt-4 whitespace-pre-line ${
              msg.includes("🎉") ? "text-green-600" : "text-red-600"
            }`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
