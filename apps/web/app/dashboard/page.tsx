"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff } from "lucide-react";

import { useDashboard } from "../hooks/useDashboard";
import { useCreateLicense } from "../hooks/useCreateLicense";
import { useToggleLicense } from "../hooks/useToggleLicense";

/* ---------------- TYPES ---------------- */

type LicenseData = {
  _id: string;
  key: string;
  productName: string;
  customer: string;
  duration: number;
  status: "active" | "revoked" | "expired";
};

/* ---------------- PAGE ---------------- */

export default function DashboardPage() {
  const router = useRouter();
  const token = Cookies.get("jwt");

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    productName: "",
    customer: "",
    duration: 1,
  });

  /* ---------------- AUTH ---------------- */

  const userId = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode<{ userId?: string }>(token).userId;
    } catch {
      return null;
    }
  }, [token]);

  if (!token || !userId) {
    router.push("/login");
    return null;
  }

  /* ---------------- DATA ---------------- */

  const { data, refetch, isLoading } = useDashboard();

  const { mutate: createLicense, isPending } = useCreateLicense(() => {
    setShowCreateModal(false);
    setForm({ productName: "", customer: "", duration: 1 });
    refetch();
  });

  const { mutate: toggleStatus, isPending: isToggling } =
    useToggleLicense(refetch);

  /* ---------------- STATUS FIX ---------------- */

  const licenses: LicenseData[] =
    data?.licenses?.map((l: LicenseData) => ({
      ...l,
      status: l.status.toLowerCase(),
    })) || [];

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const logout = () => {
    Cookies.remove("jwt");
    router.push("/login");
  };

  /* ---------------- UI ---------------- */

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[35px_35px]" />

      <div className="relative z-10 px-8 py-8">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-white">License Dashboard</h1>

          <div className="relative flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              + Create License
            </button>

            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-10 h-10 rounded-full bg-white text-black font-bold"
            >
              {data?.user?.name?.[0] || "U"}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg w-56 p-4">
                <p className="font-semibold">{data?.user?.name}</p>
                <p className="text-sm text-gray-500">{data?.user?.email}</p>
                <button
                  onClick={logout}
                  className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* TABLE */}
        <section className="bg-white/95 backdrop-blur rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Your Licenses</h2>
          </div>

          {isLoading ? (
            <p className="p-6 text-center text-gray-500">Loading...</p>
          ) : licenses.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
              No licenses created yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4 text-left">Product</th>
                  <th>Customer</th>
                  <th>License Key</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {licenses.map((lic) => (
                  <tr
                    key={lic._id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-4 font-semibold">{lic.productName}</td>
                    <td>{lic.customer}</td>

                    {/* KEY WITH SHOW / HIDE */}
                    <td className="font-mono text-blue-600">
                      <div className="flex items-center gap-2">
                        {visibleKeys[lic._id] ? lic.key : "••••••••••••••••"}
                        <button
                          onClick={() => toggleKeyVisibility(lic._id)}
                          className="text-gray-500 hover:text-black"
                        >
                          {visibleKeys[lic._id] ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </td>

                    <td>{lic.duration} months</td>

                    <td>
                      <ToggleSwitch
                        checked={lic.status === "active"}
                        disabled={isToggling}
                        onChange={() => toggleStatus(lic.key)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h2 className="text-xl font-bold mb-4">Create License</h2>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createLicense(form);
            }}
          >
            <input
              placeholder="Product Name"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
              className="w-full border p-3 rounded-lg"
            />
            <input
              placeholder="Customer"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
              className="w-full border p-3 rounded-lg"
            />
            <input
              type="number"
              min={1}
              max={12}
              value={form.duration}
              onChange={(e) =>
                setForm({ ...form, duration: Number(e.target.value) })
              }
              className="w-full border p-3 rounded-lg"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

/* ---------------- COMPONENTS ---------------- */

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative transition ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-xl w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
