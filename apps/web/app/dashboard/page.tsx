"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCookie, deleteCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";

type LicenseForm = {
  productName: string;
  customer: string;
  duration: number;
};

type JwtPayload = {
  id?: string;
  userId?: string;
  _id?: string;
  email?: string;
};

type License = {
  _id: string;
  key: string;
  productName: string;
  customer: string;
  duration: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getCookie("jwt") : null;

  const userId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<JwtPayload>(token as string);
      return decoded.id || decoded.userId || decoded._id || null;
    } catch {
      return null;
    }
  }, [token]);

  /* ------------------------ 🌱 States (Hooks first!) ------------------------ */
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<LicenseForm>({
    productName: "",
    customer: "",
    duration: 1,
  });

  const update = (key: keyof LicenseForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* --------------------------- Data Fetch (hook) ---------------------------- */
  const fetchDashboard = async () => {
    const res = await fetch("http://localhost:5000/license/test", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "❌ Failed to load data");
    return data;
  };

  const {
    data,
    refetch: refetchDashboard,
    isLoading,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    enabled: !!token,
  });

  /* --------------------------- Mutations (hooks) ---------------------------- */
  const createLicense = async (form: LicenseForm) => {
    const res = await fetch("http://localhost:5000/license/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "❌ License creation failed");
    return data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: createLicense,
    onSuccess: (data: { licenseKey: string }) => {
      setMsg("🎉 License Created!");
      setForm({ productName: "", customer: "", duration: 1 });
      refetchDashboard();
      console.log(data.licenseKey);
    },
    onError: (err: unknown) =>
      setMsg(err instanceof Error ? err.message : "❌ Something went wrong"),
  });

  const logout = () => {
    deleteCookie("jwt");
    router.push("/login");
  };

  /* --------------------------- 🚫 Early Return now -------------------------- */
  if (!token || !userId) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-2xl font-bold text-red-600">❌ Not Authorized</p>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }

  /* --------------------------------- UI ------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </header>

      {isLoading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <>
          {/* User Info */}
          {data?.user && (
            <div className="text-center mb-8 p-4 bg-white rounded-xl shadow">
              <p className="font-bold text-xl">Welcome, {data.user.name}</p>
              <p className="text-gray-600">{data.user.email}</p>
              <p className="text-sm mt-1 text-gray-500">
                User ID: {data.user._id}
              </p>
            </div>
          )}

          {/* License Form */}
          <div className="max-w-xl mx-auto bg-white p-8 shadow-lg rounded-xl space-y-6 border">
            <h2 className="text-2xl font-bold text-blue-600">
              Create License Key
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMsg("");
                mutate(form);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Product Name"
                required
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <input
                type="text"
                placeholder="Customer"
                required
                value={form.customer}
                onChange={(e) => update("customer", e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <input
                type="number"
                min={1}
                max={12}
                required
                value={form.duration}
                onChange={(e) => update("duration", Number(e.target.value))}
                className="w-full border rounded-lg p-3"
              />

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create License"}
              </button>
            </form>

            {msg && (
              <p
                className={`text-center font-medium ${
                  msg.includes("🎉") ? "text-green-600" : "text-red-600"
                }`}
              >
                {msg}
              </p>
            )}
          </div>

          {/* License List */}
          <div className="max-w-3xl mx-auto mt-10">
            <h3 className="text-xl font-semibold mb-4">📦 Your Licenses</h3>

            {data?.licenses?.length > 0 ? (
              data.licenses.map((lic: License) => (
                <div
                  key={lic._id}
                  className="p-4 bg-white rounded-lg shadow mb-3 border"
                >
                  <p>
                    <b>🔑 Key:</b> {lic.key}
                  </p>
                  <p>
                    <b>📦 Product:</b> {lic.productName}
                  </p>
                  <p>
                    <b>👤 Customer:</b> {lic.customer}
                  </p>
                  <p>
                    <b>🕒 Duration:</b> {lic.duration} months
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No licenses found. Create one!</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
