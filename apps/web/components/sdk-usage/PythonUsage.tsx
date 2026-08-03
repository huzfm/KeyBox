"use client"

import { useState } from "react"
import CodeBlock from "../ui/CodeBlock"

export default function PythonUsage() {
        const [activeSection, setActiveSection] = useState("installation")

        const quickStartCode = `import os
from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Your app is licensed and running."}

protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
)`

        const callbacksCode = `import os
from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app

app = FastAPI()

protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],

    # Called when the license transitions to REVOKED / EXPIRED / PENDING
    on_revoke=lambda data: print("License inactive — all requests now return 402"),

    # Called when the license transitions back to ACTIVE
    on_recover=lambda data: print("License recovered — requests are flowing again"),
)`

        const bypassCode = `protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],

    # These paths skip the 402 guard (prefix-matched)
    # /health and /license/status are always bypassed automatically
    bypass_paths=["/webhook", "/public"],
)`

        const statusEndpointCode = `from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app, get_license_state

app = FastAPI()

# Expose license state for your frontend or monitoring tools
# /license/status is always bypassed by the guard
@app.get("/license/status")
def license_status():
    return {"state": get_license_state()}

protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
)`

        const advancedCode = `protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],

    bypass_paths=["/webhook"],      # paths that skip the 402 guard
    interval_seconds=900,           # revalidation interval (default: 15 min)
    request_timeout=10,             # per-request network timeout in seconds (default: 10)
    offline_grace_seconds=3600,     # stay ACTIVE offline for up to 1 hour
    on_revoke=lambda data: ...,
    on_recover=lambda data: ...,
)`

        const licenseStatesCode = `from keybox_sdk import LicenseState

LicenseState.ACTIVE              # "ACTIVE"       — requests allowed
LicenseState.PENDING             # "PENDING"      — not yet activated (402)
LicenseState.EXPIRED             # "EXPIRED"      — license period ended (402)
LicenseState.REVOKED             # "REVOKED"      — explicitly disabled (402)
LicenseState.PENDING_VALIDATION  # "pending_validation" — cold start (402)`

        const manualCode = `from keybox_sdk import (
    license_guard,
    start_license_daemon,
    stop_license_daemon,
)
import os

# Register guard manually (instead of using protect_fastapi_app)
app.middleware("http")(license_guard(bypass_paths=["/webhook"]))

@app.on_event("startup")
def startup():
    start_license_daemon(
        product_name="MyApp",
        key=os.environ["KEYBOX_LICENSE_KEY"],
        on_revoke=lambda data: print("Revoked"),
        on_recover=lambda data: print("Recovered"),
    )

@app.on_event("shutdown")
def shutdown():
    stop_license_daemon()`

        const sections = [
                { id: "installation", label: "Installation" },
                { id: "quickstart", label: "Quick Start" },
                { id: "callbacks", label: "Callbacks" },
                { id: "bypass", label: "Bypass Paths" },
                { id: "status", label: "License Status" },
                { id: "advanced", label: "Advanced Options" },
                { id: "manual", label: "Manual Setup" },
                { id: "states", label: "License States" },
        ]

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
                                                                Requires Python ≥ 3.10 and FastAPI.
                                                        </p>
                                                </div>
                                                <CodeBlock
                                                        code="pip install keybox-sdk"
                                                        language="bash"
                                                        title="Terminal"
                                                />
                                        </div>
                                )}

                                {activeSection === "quickstart" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Quick Start</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                One call registers the license guard as FastAPI middleware, activates on
                                                                first run, and starts the background validation daemon.
                                                        </p>
                                                </div>
                                                <CodeBlock
                                                        code="pip install keybox-sdk"
                                                        language="bash"
                                                        title="Terminal"
                                                />
                                                <CodeBlock code={quickStartCode} language="python" title="main.py" />
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
                                                <CodeBlock code={callbacksCode} language="python" title="main.py" />
                                                <div className="text-zinc-400 text-sm space-y-1">
                                                        <p><code className="text-zinc-300">on_revoke</code> fires when transitioning <strong className="text-white">into</strong> any inactive state (REVOKED, EXPIRED, PENDING).</p>
                                                        <p><code className="text-zinc-300">on_recover</code> fires when transitioning <strong className="text-white">back to</strong> ACTIVE.</p>
                                                        <p>Both receive the raw server response dict (or <code className="text-zinc-300">None</code> on network errors). Exceptions are caught and logged.</p>
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
                                                <CodeBlock code={bypassCode} language="python" title="main.py" />
                                                <div className="text-zinc-400 text-sm space-y-1">
                                                        <p>Paths use <strong className="text-white">prefix matching</strong>: <code className="text-zinc-300">&quot;/public&quot;</code> also bypasses <code className="text-zinc-300">&quot;/public/assets/logo.png&quot;</code>.</p>
                                                        <p>The following paths are <strong className="text-white">always</strong> bypassed:</p>
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
                                                <CodeBlock code={statusEndpointCode} language="python" title="main.py" />
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
                                                                Full parameter reference for <code className="text-zinc-300">protect_fastapi_app()</code>.
                                                        </p>
                                                </div>
                                                <CodeBlock code={advancedCode} language="python" title="main.py" />
                                                <div className="text-zinc-400 text-sm space-y-2">
                                                        <p><strong className="text-white">offline_grace_seconds</strong> — when the server is unreachable after a previously confirmed ACTIVE state, the SDK stays unlocked for this many seconds before blocking. Default: <code className="text-zinc-300">max(2 × interval_seconds, 1800)</code>.</p>
                                                </div>
                                        </div>
                                )}

                                {activeSection === "manual" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">Manual Setup</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                Use individual primitives when you need more control over the pipeline.
                                                        </p>
                                                </div>
                                                <CodeBlock code={manualCode} language="python" title="main.py" />
                                        </div>
                                )}

                                {activeSection === "states" && (
                                        <div className="space-y-4">
                                                <div>
                                                        <h2 className="text-2xl font-bold text-white mb-1">License States</h2>
                                                        <p className="text-zinc-400 text-sm mb-4">
                                                                All possible values returned by <code className="text-zinc-300">get_license_state()</code>.
                                                        </p>
                                                </div>
                                                <CodeBlock code={licenseStatesCode} language="python" title="reference" />
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
