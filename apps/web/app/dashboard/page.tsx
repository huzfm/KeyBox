"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { useDashboard } from "../hooks/useDashboard";
import { useCreateLicense } from "../hooks/useCreateLicense";
import { useToggleLicense } from "../hooks/useToggleLicense";

type LicenseData = {
  _id: string;
  key: string;
  productName: string;
  customer: string;
  duration: number;
  status: "active" | "revoked";
};

export default function DashboardPage() {
  const router = useRouter();
  const token = Cookies.get("jwt");

  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    productName: "",
    customer: "",
    duration: 1,
  });

  // Decode JWT safely
  const userId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ id?: string; userId?: string; _id?: string }>(
        token
      );
      return decoded.id || decoded.userId || decoded._id || null;
    } catch {
      return null;
    }
  }, [token]);

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const { data, refetch, isLoading } = useDashboard();

  const { mutate: createLicense, isPending } = useCreateLicense(
    () => {
      setMsg("🎉 License Created!");
      setForm({ productName: "", customer: "", duration: 1 });
      refetch();
    },
    (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "❌ Something went wrong";
      setMsg(message);
    }
  );

  const { mutate: toggleStatus, isPending: isToggling } = useToggleLicense(
    refetch,
    setMsg
  );

  const logout = () => {
    Cookies.remove("jwt");
    router.push("/login");
  };

  // Unauthorized fallback
  if (!token || !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-xl text-center shadow-xl space-y-4 max-w-md">
          <p className="text-2xl font-bold text-red-600">❌ Not Authorized</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      {/* Navbar */}
      <header className="flex justify-between items-center bg-white p-5 rounded-xl shadow mb-10">
        <h1 className="text-3xl font-bold text-gray-700">🚀 Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </header>

      {/* Page Content */}
      {isLoading ? (
        <p className="text-center text-gray-500 text-lg">Loading...</p>
      ) : (
        <>
          {/* Profile */}
          {data?.user && (
            <section className="bg-white p-6 mb-8 rounded-xl shadow text-center">
              <h2 className="font-bold text-2xl">{data.user.name}</h2>
              <p className="text-gray-600">{data.user.email}</p>
              <span className="text-sm text-gray-400">
                User ID: {data.user._id}
              </span>
            </section>
          )}

          {/* Create License */}
          <section className="bg-white max-w-xl mx-auto p-8 rounded-xl shadow border mb-10">
            <h2 className="text-xl font-bold text-blue-600 text-center mb-4">
              Create New License
            </h2>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setMsg("");
                createLicense(form);
              }}
            >
              <input
                type="text"
                placeholder="Product Name"
                required
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                className="w-full border rounded-md p-3"
              />

              <input
                type="text"
                placeholder="Customer Name"
                required
                value={form.customer}
                onChange={(e) => update("customer", e.target.value)}
                className="w-full border rounded-md p-3"
              />

              <input
                type="number"
                min={1}
                max={12}
                required
                value={form.duration}
                onChange={(e) => update("duration", Number(e.target.value))}
                className="w-full border rounded-md p-3"
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
                className={`mt-3 text-center font-medium ${
                  msg.includes("🎉")
                    ? "text-green-600"
                    : msg.includes("🔄")
                      ? "text-blue-600"
                      : "text-red-600"
                }`}
              >
                {msg}
              </p>
            )}
          </section>

          {/* License List */}
          <section className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">📦 Your Licenses</h3>

            {data?.licenses?.length === 0 ? (
              <p className="text-gray-500 text-center">
                No licenses found. Create one!
              </p>
            ) : (
              <div className="space-y-4">
                {data.licenses.map((lic: LicenseData) => (
                  <div
                    key={lic._id}
                    className="bg-white p-5 rounded-xl flex justify-between items-center shadow border"
                  >
                    {/* License Info */}
                    <div className="space-y-1">
                      <p className="font-mono text-blue-600 break-all">
                        {lic.key}
                      </p>
                      <p>
                        <b>Product:</b> {lic.productName}
                      </p>
                      <p>
                        <b>Customer:</b> {lic.customer}
                      </p>
                      <p>
                        <b>Duration:</b> {lic.duration} months
                      </p>

                      <span
                        className={`inline-block mt-1 px-2 py-1 text-xs rounded-md font-semibold 
                          ${
                            lic.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        {lic.status}
                      </span>
                    </div>

                    {/* Toggle Button */}
                    <button
                      disabled={isToggling}
                      onClick={() => toggleStatus(lic.key)}
                      className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
                        lic.status === "active"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {lic.status === "active" ? "Revoke" : "Activate"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
