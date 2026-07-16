"use client"

import { motion } from "framer-motion"
import { X, Check } from "lucide-react"
import { FadeUp } from "./ui/Motion"

const rows = [
        { without: "Write custom validation logic for every project",             with: "One SDK call — activation, validation, expiry all included" },
        { without: "Build expiry tracking and renewal notifications yourself",    with: "Set an expiry date in the dashboard, SDK enforces it automatically" },
        { without: "Implement machine binding to prevent key sharing",            with: "Machine ID and instance ID binding built in, server-verified" },
        { without: "Handle offline scenarios — keep app alive or kill it?",       with: "Configurable offline grace period, then auto-block after timeout" },
        { without: "Restart your app to pick up license renewals",               with: "Daemon polls every 15 min — renewals go live with zero restarts" },
        { without: "Manually revoke and re-deploy to enforce license termination", with: "Revoke from the dashboard — blocked on next validation tick" },
]

export default function WhyKeyBox() {
        return (
                <section className="relative py-24 px-4">
                        <div className="max-w-4xl mx-auto">

                                <FadeUp className="text-center mb-16">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono mb-4">
                                                Why not just build it yourself?
                                        </h2>
                                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                                                You could. But license enforcement has more edge cases than it looks.
                                        </p>
                                </FadeUp>

                                <motion.div
                                        initial={{ opacity: 0, y: 24 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-40px" }}
                                        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                                        className="rounded-2xl border border-zinc-800 overflow-hidden"
                                >
                                        {/* Header */}
                                        <div className="grid grid-cols-2 bg-zinc-900/80">
                                                <div className="px-6 py-4 border-r border-zinc-800">
                                                        <span className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Without KeyBox</span>
                                                </div>
                                                <div className="px-6 py-4">
                                                        <span className="text-sm font-semibold text-white uppercase tracking-widest">With KeyBox</span>
                                                </div>
                                        </div>

                                        {/* Rows */}
                                        {rows.map((row, i) => (
                                                <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        whileInView={{ opacity: 1, x: 0 }}
                                                        viewport={{ once: true, margin: "-20px" }}
                                                        transition={{ duration: 0.45, delay: i * 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                        className="grid grid-cols-2 border-t border-zinc-800/60"
                                                >
                                                        <div className="px-6 py-5 flex items-start gap-3 border-r border-zinc-800/60 bg-zinc-950/40">
                                                                <X className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                                                                <span className="text-sm text-zinc-500 leading-relaxed">{row.without}</span>
                                                        </div>
                                                        <div className="px-6 py-5 flex items-start gap-3 bg-zinc-900/20">
                                                                <Check className="w-4 h-4 text-white mt-0.5 shrink-0" />
                                                                <span className="text-sm text-zinc-200 leading-relaxed">{row.with}</span>
                                                        </div>
                                                </motion.div>
                                        ))}
                                </motion.div>
                        </div>
                </section>
        )
}
