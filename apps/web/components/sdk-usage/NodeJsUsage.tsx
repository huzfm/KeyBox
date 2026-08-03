"use client"

import { useState } from "react"
import CodeBlock from "../ui/CodeBlock"

type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export default function NodeJsUsage() {
        const [packageManager, setPackageManager] =
                useState<PackageManager>("npm")

        const installCommands: Record<PackageManager, string> = {
                npm: "npm install keybox-sdk",
                pnpm: "pnpm add keybox-sdk",
                yarn: "yarn add keybox-sdk",
                bun: "bun add keybox-sdk",
        }

        const quickStartCode = `import express from "express"
import { protectNodeApp } from "keybox-sdk"

const app = express()

app.get("/", (_req, res) => {
  res.send("Your app is licensed and running.")
})

await protectNodeApp({
  app,
  port: 3000,
  productName: "MyApp",
  key: process.env.KEYBOX_LICENSE_KEY,
})`

        const callbacksCode = `await protectNodeApp({
  app,
  port: 3000,
  productName: "MyApp",
  key: process.env.KEYBOX_LICENSE_KEY,

  // Called when the license transitions to REVOKED / EXPIRED / PENDING
  onRevoke: (serverData) => {
    console.error("License inactive — all requests now return 402")
    // send alert, write to log, etc.
  },

  // Called when the license transitions back to ACTIVE
  onRecover: (serverData) => {
    console.log("License recovered — requests are flowing again")
  },
})`

        const bypassCode = `await protectNodeApp({
  app,
  port: 3000,
  productName: "MyApp",
  key: process.env.KEYBOX_LICENSE_KEY,

  // These paths skip the 402 guard (prefix-matched)
  // /health and /license/status are always bypassed automatically
  bypassPaths: ["/webhook", "/public"],
})`

        const statusEndpointCode = `import { getLicenseState } from "keybox-sdk"

// Add this route to expose license state in your dashboard
app.get("/license/status", (req, res) => {
  res.json({ state: getLicenseState() })
})`

        const advancedCode = `await protectNodeApp({
  app,
  port: 3000,
  productName: "MyApp",
  key: process.env.KEYBOX_LICENSE_KEY,

  bypassPaths: ["/webhook"],          // paths that skip the 402 guard
  intervalSeconds: 900,               // revalidation interval (default: 15 min)
  fetchTimeoutMs: 10_000,             // per-request network timeout (default: 10s)
  offlineGraceSeconds: 3600,          // stay ACTIVE offline for up to 1 hour
  onRevoke: (data) => { /* ... */ },
  onRecover: (data) => { /* ... */ },
})`

        const licenseStatesCode = `import { LicenseState } from "keybox-sdk"

LicenseState.ACTIVE              // "ACTIVE"       — requests allowed
LicenseState.PENDING             // "PENDING"      — not yet activated (402)
LicenseState.EXPIRED             // "EXPIRED"      — license period ended (402)
LicenseState.REVOKED             // "REVOKED"      — explicitly disabled (402)
LicenseState.PENDING_VALIDATION  // "pending_validation" — cold start (402)`

        const sections = [
                { id: "installation", label: "Installation" },
                { id: "quickstart", label: "Quick Start" },
                { id: "callbacks", label: "Callbacks" },
                { id: "bypass", label: "Bypass Paths" },
                { id: "status", label: "License Status" },
                { id: "advanced", label: "Advanced Options" },
                { id: "states", label: "License States" },
        ]

        const [activeSection, setActiveSection] = useState("installation")

        return (
                <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar nav */}
                        <nav className="lg:w-44 shrink-0">
                                <ul className="flex lg:flex-col gap-1 flex-wrap">
                                        {sections.map((s) => (
                                                <li key={s.id}>
                                                        <button
                                                                onClick={() => setActiveSection(s.id)}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                          ${activeSection === s.id
                                                                        ? "bg-zinc-800 text-white font-medium"
                                                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                                                                }`}
                                                        >
                                                                {s.label}
                                                        </button>
                                                </li>
                                        ))}
                                </ul>
                        </nav>

                        {/* Content */}
                        <div className="flex-1 space-y-6 min-w-0">
                                {activeSection === "installation" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Installation</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                Requires Node.js ≥ 18 and Express ≥ 4.
                                                        </p>
                                                </div>
                                                <div className="flex gap-2 mb-4 flex-wrap">
                                                        {(["npm", "pnpm", "yarn", "bun"] as PackageManager[]).map((pm) => (
                                                                <button
                                                                        key={pm}
                                                                        onClick={() => setPackageManager(pm)}
                                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${packageManager === pm
                                                                                        ? "bg-zinc-700 text-white"
                                                                                        : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/60 border border-zinc-800/40"
                                                                                }`}
                                                                >
                                                                        {pm}
                                                                </button>
                                                        ))}
                                                </div>
                                                <CodeBlock
                                                        code={installCommands[packageManager]}
                                                        language="bash"
                                                        title="Terminal"
                                                />
                                                <p className="text-zinc-500 text-xs">
                                                        Express is a peer dependency — install it separately if you haven&apos;t already.
                                                </p>
                                        </div>
                                )}

                                {activeSection === "quickstart" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Quick Start</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                One call wraps your Express app with license enforcement, starts the
                                                                background validation daemon, and calls <code className="text-zinc-300">app.listen()</code>.
                                                        </p>
                                                </div>
                                                <CodeBlock
                                                        code={installCommands[packageManager]}
                                                        language="bash"
                                                        title="Terminal"
                                                />
                                                <CodeBlock code={quickStartCode} language="javascript" title="index.js" />
                                                <ul className="text-zinc-400 text-sm space-y-1 list-disc list-inside">
                                                        <li>Activates the license on first run, writes <code className="text-zinc-300">.instance-id</code> to disk</li>
                                                        <li>Returns <strong className="text-white">HTTP 402</strong> on all requests while inactive</li>
                                                        <li>Revalidates every <strong className="text-white">15 minutes</strong> — picks up renewals automatically, no restart needed</li>
                                                </ul>
                                        </div>
                                )}

                                {activeSection === "callbacks" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Callbacks</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                React to license state transitions without polling.
                                                        </p>
                                                </div>
                                                <CodeBlock code={callbacksCode} language="javascript" title="index.js" />
                                                <div className="text-zinc-400 text-sm space-y-1">
                                                        <p><code className="text-zinc-300">onRevoke</code> fires when transitioning <strong className="text-white">into</strong> any inactive state (REVOKED, EXPIRED, PENDING).</p>
                                                        <p><code className="text-zinc-300">onRecover</code> fires when transitioning <strong className="text-white">back to</strong> ACTIVE.</p>
                                                        <p>Exceptions in callbacks are caught and logged — they never crash the daemon.</p>
                                                </div>
                                        </div>
                                )}

                                {activeSection === "bypass" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Bypass Paths</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                Certain routes should always be reachable regardless of license state.
                                                        </p>
                                                </div>
                                                <CodeBlock code={bypassCode} language="javascript" title="index.js" />
                                                <div className="text-zinc-400 text-sm space-y-1">
                                                        <p>Paths use <strong className="text-white">prefix matching</strong>: <code className="text-zinc-300">&quot;/public&quot;</code> also bypasses <code className="text-zinc-300">&quot;/public/assets/logo.png&quot;</code>.</p>
                                                        <p>The following paths are <strong className="text-white">always</strong> bypassed regardless of <code className="text-zinc-300">bypassPaths</code>:</p>
                                                        <ul className="list-disc list-inside ml-2">
                                                                <li><code className="text-zinc-300">/health</code></li>
                                                                <li><code className="text-zinc-300">/license/status</code></li>
                                                        </ul>
                                                </div>
                                        </div>
                                )}

                                {activeSection === "status" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">License Status Endpoint</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                Expose the current license state for your frontend or monitoring tools.
                                                        </p>
                                                </div>
                                                <CodeBlock code={statusEndpointCode} language="javascript" title="index.js" />
                                                <p className="text-zinc-400 text-sm">
                                                        <code className="text-zinc-300">/license/status</code> is automatically bypassed by the guard,
                                                        so it always responds — even when the license is inactive.
                                                </p>
                                        </div>
                                )}

                                {activeSection === "advanced" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Advanced Options</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                Full parameter reference for <code className="text-zinc-300">protectNodeApp()</code>.
                                                        </p>
                                                </div>
                                                <CodeBlock code={advancedCode} language="javascript" title="index.js" />
                                                <div className="text-zinc-400 text-sm space-y-2">
                                                        <p><strong className="text-white">offlineGraceSeconds</strong> — when the server is unreachable after a previously confirmed ACTIVE state, the SDK stays unlocked for this many seconds before blocking. Default: <code className="text-zinc-300">max(2 × intervalSeconds, 1800)</code>.</p>
                                                </div>
                                        </div>
                                )}

                                {activeSection === "states" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">License States</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                All possible values returned by <code className="text-zinc-300">getLicenseState()</code>.
                                                        </p>
                                                </div>
                                                <CodeBlock code={licenseStatesCode} language="javascript" title="reference" />
                                                <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left border-collapse">
                                                                <thead>
                                                                        <tr className="border-b border-zinc-800">
                                                                                <th className="py-2 pr-4 text-zinc-300 font-medium">State</th>
                                                                                <th className="py-2 pr-4 text-zinc-300 font-medium">Meaning</th>
                                                                                <th className="py-2 text-zinc-300 font-medium">Requests</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody className="text-zinc-400">
                                                                        <tr className="border-b border-zinc-800/50">
                                                                                <td className="py-2 pr-4"><code className="text-zinc-300">pending_validation</code></td>
                                                                                <td className="py-2 pr-4">Cold-start — server not yet contacted</td>
                                                                                <td className="py-2 text-red-400">Blocked (402)</td>
                                                                        </tr>
                                                                        <tr className="border-b border-zinc-800/50">
                                                                                <td className="py-2 pr-4"><code className="text-zinc-300">ACTIVE</code></td>
                                                                                <td className="py-2 pr-4">License confirmed valid</td>
                                                                                <td className="py-2 text-green-400">Allowed</td>
                                                                        </tr>
                                                                        <tr className="border-b border-zinc-800/50">
                                                                                <td className="py-2 pr-4"><code className="text-zinc-300">PENDING</code></td>
                                                                                <td className="py-2 pr-4">Key exists but never activated</td>
                                                                                <td className="py-2 text-red-400">Blocked (402)</td>
                                                                        </tr>
                                                                        <tr className="border-b border-zinc-800/50">
                                                                                <td className="py-2 pr-4"><code className="text-zinc-300">EXPIRED</code></td>
                                                                                <td className="py-2 pr-4">License period ended</td>
                                                                                <td className="py-2 text-red-400">Blocked (402)</td>
                                                                        </tr>
                                                                        <tr>
                                                                                <td className="py-2 pr-4"><code className="text-zinc-300">REVOKED</code></td>
                                                                                <td className="py-2 pr-4">Explicitly disabled by the developer</td>
                                                                                <td className="py-2 text-red-400">Blocked (402)</td>
                                                                        </tr>
                                                                </tbody>
                                                        </table>
                                                </div>
                                        </div>
                                )}
                        </div>
                </div>
        )
}
