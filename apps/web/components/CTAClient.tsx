"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ScaleIn } from "./ui/Motion"

export default function CTAClient({ isLoggedIn }: { isLoggedIn: boolean }) {
        return (
                <section className="relative py-24 px-4">
                        <div className="max-w-3xl mx-auto">
                                <ScaleIn>
                                        {/* Border beam wrapper */}
                                        <div className="relative rounded-2xl overflow-hidden p-[1px]">

                                                {/* Spinning conic-gradient border */}
                                                <div
                                                        className="animate-spin-slow absolute inset-0 rounded-2xl"
                                                        style={{
                                                                background:
                                                                        "conic-gradient(from 0deg, transparent 0%, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%, transparent 100%)",
                                                        }}
                                                />

                                                {/* Inner card */}
                                                <div className="relative rounded-2xl bg-zinc-900/90 px-8 py-16 text-center overflow-hidden">

                                                        {/* Radial glow centre */}
                                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                                <motion.div
                                                                        animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }}
                                                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                                        className="w-[500px] h-[500px] rounded-full bg-white blur-3xl"
                                                                />
                                                        </div>

                                                        <div className="relative z-10">
                                                                <motion.h2
                                                                        initial={{ opacity: 0, y: 24 }}
                                                                        whileInView={{ opacity: 1, y: 0 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                                        className="text-3xl sm:text-4xl font-bold text-white font-mono mb-4"
                                                                >
                                                                        Ready to protect your software?
                                                                </motion.h2>

                                                                <motion.p
                                                                        initial={{ opacity: 0, y: 16 }}
                                                                        whileInView={{ opacity: 1, y: 0 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                                        className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto"
                                                                >
                                                                        Add license enforcement in under 5 minutes.
                                                                        Free to get started — no credit card required.
                                                                </motion.p>

                                                                <motion.div
                                                                        initial={{ opacity: 0, y: 12 }}
                                                                        whileInView={{ opacity: 1, y: 0 }}
                                                                        viewport={{ once: true }}
                                                                        transition={{ duration: 0.5, delay: 0.2 }}
                                                                        className="flex flex-col sm:flex-row gap-4 justify-center"
                                                                >
                                                                        <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
                                                                                <motion.button
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.97 }}
                                                                                        className="px-8 py-3 bg-slate-100 font-semibold text-black rounded-xl shadow-[0_0_35px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.55)] transition-shadow duration-300 w-full sm:w-auto"
                                                                                >
                                                                                        {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
                                                                                </motion.button>
                                                                        </Link>
                                                                        <Link href="/sdk-usage">
                                                                                <motion.button
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.97 }}
                                                                                        className="px-8 py-3 bg-transparent font-semibold text-white rounded-xl border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 transition-colors duration-200 w-full sm:w-auto"
                                                                                >
                                                                                        View SDK Docs
                                                                                </motion.button>
                                                                        </Link>
                                                                </motion.div>
                                                        </div>
                                                </div>
                                        </div>
                                </ScaleIn>
                        </div>
                </section>
        )
}
