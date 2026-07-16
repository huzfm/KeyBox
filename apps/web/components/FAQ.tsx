"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { FadeUp } from "./ui/Motion"

const faqs = [
        {
                q: "What happens when a license expires? Does my user's app crash?",
                a: "No crash. When the daemon detects an expired license, it sets the state to EXPIRED and the SDK returns HTTP 402 on every request going forward. The app process keeps running — when the license is renewed, the next validation tick (within 15 minutes) flips it back to ACTIVE with no restart needed.",
        },
        {
                q: "Can my users' apps work offline?",
                a: "Yes, for a configurable grace period. If the KeyBox server is unreachable after the license was previously confirmed ACTIVE, the SDK stays unlocked for max(2 × interval, 30 minutes) by default. Once the grace period expires, requests are blocked until the server is reachable again.",
        },
        {
                q: "How is the machine ID generated? Does it expose user data?",
                a: "The machine ID is a SHA-256 hash of the machine hostname and MAC address. It is one-way — you cannot reverse it to identify a user. It's used solely to bind a license key to a specific installation so the same key can't be shared across machines.",
        },
        {
                q: "What is the .instance-id file? Can I delete it?",
                a: "It's a UUID written to disk on first successful activation. It identifies this specific installation's license slot on the KeyBox server. If you delete it, the next startup will attempt re-activation — which will fail if the key is already bound to a different instance ID. Don't delete it, and add it to .gitignore.",
        },
        {
                q: "Can I use the SDK with frameworks other than Express, FastAPI, or ASP.NET Core?",
                a: "The guard middleware is framework-specific, but the lower-level primitives (activate_license, start_license_daemon, get_license_state) are framework-agnostic. You can use them directly and wire the 402 enforcement into any framework's middleware chain.",
        },
        {
                q: "If I revoke a license, how quickly does the user's app get blocked?",
                a: "Within one daemon cycle — up to 15 minutes by default. The daemon polls on a fixed interval, so after you revoke from the dashboard the app will be blocked on the next successful validation tick. You can shorten this by lowering intervalSeconds in the SDK options.",
        },
        {
                q: "Is there a free tier?",
                a: "Yes. KeyBox is free to get started. You can manage clients and projects, generate license keys, and use all three SDKs without paying anything. Paid plans unlock higher limits and priority support.",
        },
]

export default function FAQ() {
        const [open, setOpen] = useState<number | null>(null)

        return (
                <section className="relative py-24 px-4">
                        <div className="max-w-3xl mx-auto">

                                <FadeUp className="text-center mb-16">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono mb-4">
                                                Frequently asked questions
                                        </h2>
                                        <p className="text-zinc-400 text-lg">
                                                Things developers ask before integrating.
                                        </p>
                                </FadeUp>

                                <div className="space-y-2">
                                        {faqs.map((faq, i) => (
                                                <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        viewport={{ once: true, margin: "-20px" }}
                                                        transition={{ duration: 0.45, delay: i * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                        className="rounded-xl border border-zinc-800 overflow-hidden"
                                                >
                                                        <button
                                                                onClick={() => setOpen(open === i ? null : i)}
                                                                className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors group"
                                                        >
                                                                <span className="text-sm sm:text-base font-medium text-white">
                                                                        {faq.q}
                                                                </span>
                                                                <motion.span
                                                                        animate={{ rotate: open === i ? 45 : 0 }}
                                                                        transition={{ duration: 0.25 }}
                                                                        className="shrink-0 mt-0.5 text-zinc-400"
                                                                >
                                                                        {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                                </motion.span>
                                                        </button>

                                                        <AnimatePresence initial={false}>
                                                                {open === i && (
                                                                        <motion.div
                                                                                key="content"
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                                                className="overflow-hidden"
                                                                        >
                                                                                <div className="px-6 pb-5 pt-2 bg-zinc-950/60">
                                                                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                                                                                {faq.a}
                                                                                        </p>
                                                                                </div>
                                                                        </motion.div>
                                                                )}
                                                        </AnimatePresence>
                                                </motion.div>
                                        ))}
                                </div>
                        </div>
                </section>
        )
}
