"use client";

import { motion } from "framer-motion"
import { Shield, Zap, Cpu, WifiOff, Ban, KeyRound } from "lucide-react";
import { FadeUp } from "./ui/Motion"

const ease = [0.21, 0.47, 0.32, 0.98] as const

function BentoCard({
        children,
        className = "",
        delay = 0,
}: {
        children: React.ReactNode
        className?: string
        delay?: number
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, y: 32, scale: 0.97 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.6, delay, ease }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 hover:border-zinc-600 transition-colors duration-300 cursor-default ${className}`}
                >
                        {/* Per-card radial glow on hover */}
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.05),transparent_65%)]" />
                        {/* Shimmer sweep */}
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer" />
                        {children}
                </motion.div>
        )
}

export default function Features() {
        return (
                <section className="relative py-24 px-4 overflow-hidden">
                        <div className="max-w-5xl mx-auto">

                                {/* Header */}
                                <FadeUp className="text-center mb-14">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono mb-4">
                                                Powerful Features
                                        </h2>
                                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                                                Everything you need to manage licenses efficiently.
                                        </p>
                                </FadeUp>

                                {/* Bento grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

                                        {/* ── 1. SDK Languages — 2 cols ── */}
                                        <BentoCard className="lg:col-span-2" delay={0.05}>
                                                <div className="mb-6 space-y-3">
                                                        <div className="flex gap-2 flex-wrap">
                                                                {["Node.js", "Python", ".NET"].map((lang, i) => (
                                                                        <motion.span
                                                                                key={lang}
                                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                                whileInView={{ opacity: 1, scale: 1 }}
                                                                                viewport={{ once: true }}
                                                                                transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
                                                                                className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200"
                                                                        >
                                                                                {lang}
                                                                        </motion.span>
                                                                ))}
                                                        </div>
                                                        <div className="rounded-xl bg-zinc-950 border border-zinc-800/70 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-400">
                                                                <span className="text-zinc-500">{"// Node.js"}</span><br />
                                                                <span className="text-white">protectNodeApp</span>{"({ app, port: "}<span className="text-zinc-300">3000</span>{", key })"}
                                                                <br /><br />
                                                                <span className="text-zinc-500">{"# Python"}</span><br />
                                                                <span className="text-white">protect_fastapi_app</span>{"(app=app, key=key)"}
                                                        </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Multi-Language SDK</h3>
                                                <p className="text-sm text-zinc-400">One call per language. Node.js, Python, and .NET all ship the same guarantees.</p>
                                        </BentoCard>

                                        {/* ── 2. License Keys — 1 col ── */}
                                        <BentoCard delay={0.1}>
                                                <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800/70 p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">License Key</span>
                                                                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                                                                        <span className="relative flex">
                                                                                <span className="animate-ping-slow absolute inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-75" />
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                        </span>
                                                                        ACTIVE
                                                                </span>
                                                        </div>
                                                        <div className="font-mono text-sm text-white tracking-widest">KEY‑2F9A‑7B3E‑C41D</div>
                                                        <div className="text-[11px] text-zinc-500">
                                                                Expires <span className="text-zinc-300">Dec 31, 2025</span>
                                                        </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                        <KeyRound className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Instant Key Generation</h3>
                                                <p className="text-sm text-zinc-400">Unique, cryptographically secure keys with expiry control — generated in milliseconds.</p>
                                        </BentoCard>

                                        {/* ── 3. Machine Binding — 1 col ── */}
                                        <BentoCard delay={0.15}>
                                                <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800/70 p-4 space-y-2">
                                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">machineId</span>
                                                        <div className="font-mono text-[11px] text-zinc-300 break-all leading-relaxed">
                                                                a3f9b2c1e847d056
                                                                <span className="text-zinc-600">f3a21c98b4e7...</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                <span className="text-[10px] text-zinc-400">SHA-256 · verified</span>
                                                        </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                        <Cpu className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Machine Binding</h3>
                                                <p className="text-sm text-zinc-400">One key, one machine. SHA-256 hardware fingerprint prevents key sharing across devices.</p>
                                        </BentoCard>

                                        {/* ── 4. Auto Expiry — 1 col ── */}
                                        <BentoCard delay={0.2}>
                                                <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800/70 p-4 space-y-3">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                                <span className="text-zinc-500 uppercase tracking-widest">Lifecycle</span>
                                                                <span className="text-zinc-300 font-semibold">24 days left</span>
                                                        </div>
                                                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                                                <motion.div
                                                                        className="h-full rounded-full bg-gradient-to-r from-white/60 to-white/30"
                                                                        initial={{ width: 0 }}
                                                                        whileInView={{ width: "78%" }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                                                                />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-zinc-600">
                                                                <span>Activated</span>
                                                                <span>Expires</span>
                                                        </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                        <Zap className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Auto Expiry</h3>
                                                <p className="text-sm text-zinc-400">Set an expiry date and walk away. The SDK enforces it automatically on every validation tick.</p>
                                        </BentoCard>

                                        {/* ── 5. Security — 1 col ── */}
                                        <BentoCard delay={0.25}>
                                                <div className="mb-6 flex items-center justify-center py-4">
                                                        <div className="relative animate-float">
                                                                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-zinc-500 transition-colors duration-300">
                                                                        <Shield className="w-8 h-8 text-white" />
                                                                </div>
                                                                <div className="absolute -inset-3 rounded-3xl border border-zinc-700/40" />
                                                                <div className="absolute -inset-6 rounded-3xl border border-zinc-800/40" />
                                                                <span className="absolute -top-3  left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                                                <span className="absolute top-1/2 -left-3  -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                                                <span className="absolute top-1/2 -right-3 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                        </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Security First</h3>
                                                <p className="text-sm text-zinc-400">Server-verified machine IDs, atomic activation, and fail-closed enforcement on every unrecognised response.</p>
                                        </BentoCard>

                                        {/* ── 6. Offline Grace — 1 col ── */}
                                        <BentoCard delay={0.3}>
                                                <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800/70 p-4 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                                <WifiOff className="w-4 h-4 text-zinc-500" />
                                                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Server unreachable</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                                <span className="relative flex">
                                                                        <span className="animate-ping-slow absolute inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-75" />
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                </span>
                                                                <span className="text-xs text-zinc-300">Still <span className="text-white font-semibold">ACTIVE</span></span>
                                                        </div>
                                                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                                                <motion.div
                                                                        className="h-full rounded-full bg-gradient-to-r from-white/50 to-white/20"
                                                                        initial={{ width: 0 }}
                                                                        whileInView={{ width: "55%" }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                                                                />
                                                        </div>
                                                        <div className="text-[10px] text-zinc-600">Grace period · 16 min remaining</div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                        <WifiOff className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Offline Grace Period</h3>
                                                <p className="text-sm text-zinc-400">When the server is unreachable, apps stay ACTIVE for a configurable window before blocking.</p>
                                        </BentoCard>

                                        {/* ── 7. Real-time Revocation — 2 cols ── */}
                                        <BentoCard className="lg:col-span-2" delay={0.35}>
                                                <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800/70 p-5">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                <motion.div
                                                                        initial={{ opacity: 0, x: -20 }}
                                                                        whileInView={{ opacity: 1, x: 0 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ delay: 0.5, duration: 0.4 }}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700"
                                                                >
                                                                        <span className="relative flex">
                                                                                <span className="animate-ping-slow absolute w-2 h-2 rounded-full bg-emerald-400 opacity-75" />
                                                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                                        </span>
                                                                        <span className="text-xs font-mono font-semibold text-white">ACTIVE</span>
                                                                </motion.div>

                                                                <motion.div
                                                                        initial={{ opacity: 0 }}
                                                                        whileInView={{ opacity: 1 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ delay: 0.7, duration: 0.4 }}
                                                                        className="flex items-center gap-1 text-zinc-600 text-xs font-mono"
                                                                >
                                                                        <span>─ dashboard toggle ─</span>
                                                                        <span className="text-white">→</span>
                                                                </motion.div>

                                                                <motion.div
                                                                        initial={{ opacity: 0, x: 20 }}
                                                                        whileInView={{ opacity: 1, x: 0 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ delay: 0.9, duration: 0.4 }}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700"
                                                                >
                                                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                                                        <span className="text-xs font-mono font-semibold text-white">REVOKED</span>
                                                                </motion.div>

                                                                <span className="ml-auto text-[10px] text-zinc-500 font-mono">≤ 15 min propagation</span>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                                                <div className="flex items-start gap-2 text-zinc-400">
                                                                        <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                                                                        <span>Requests pass through normally while ACTIVE</span>
                                                                </div>
                                                                <div className="flex items-start gap-2 text-zinc-400">
                                                                        <span className="text-red-400 font-bold mt-0.5">✗</span>
                                                                        <span>All requests return HTTP 402 after revocation</span>
                                                                </div>
                                                        </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                        <Ban className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1">Real-time Revocation</h3>
                                                <p className="text-sm text-zinc-400">Toggle a license off in the dashboard. No redeploy, no restart — blocked within the next validation cycle.</p>
                                        </BentoCard>

                                </div>
                        </div>
                </section>
        );
}
