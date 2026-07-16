"use client"

import { motion } from "framer-motion"
import { KeyRound, Code2, RefreshCw } from "lucide-react"
import { FadeUp, PopIn } from "./ui/Motion"

const ease = [0.21, 0.47, 0.32, 0.98] as const

const steps = [
        {
                number: "01",
                icon: KeyRound,
                title: "Create a license key",
                description:
                        "Add a client and project in the KeyBox dashboard. A unique license key is generated instantly — no code required.",
                tags: ["No code", "Instant key", "Expiry control"],
        },
        {
                number: "02",
                icon: Code2,
                title: "Embed the SDK",
                description:
                        "Drop one function call into your app. The SDK activates the license, registers the machine, and starts enforcing on every request.",
                tags: ["Node.js", "Python", ".NET"],
        },
        {
                number: "03",
                icon: RefreshCw,
                title: "KeyBox handles the rest",
                description:
                        "Background validation every 15 minutes. Automatic renewal pickup. Revoke or expire from the dashboard — no redeploy needed.",
                tags: ["Auto-renewal", "Offline grace", "Zero restarts"],
        },
]

export default function HowItWorks() {
        return (
                <section className="relative py-24 px-4 overflow-hidden">
                        <div className="max-w-4xl mx-auto">

                                {/* Header */}
                                <FadeUp className="text-center mb-20">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono mb-4">
                                                How it works
                                        </h2>
                                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                                                From zero to enforced licensing in under 5 minutes.
                                        </p>
                                </FadeUp>

                                {/* Timeline */}
                                <div className="relative">

                                        {/* Vertical line — animates in by height */}
                                        <motion.div
                                                className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2 origin-top bg-gradient-to-b from-transparent via-zinc-700 to-transparent"
                                                initial={{ scaleY: 0 }}
                                                whileInView={{ scaleY: 1 }}
                                                viewport={{ once: true, margin: "-40px" }}
                                                transition={{ duration: 1.2, ease: "easeInOut" }}
                                        />

                                        <div className="space-y-16">
                                                {steps.map((step, i) => {
                                                        const Icon = step.icon
                                                        const isRight = i % 2 === 1

                                                        return (
                                                                <div
                                                                        key={step.number}
                                                                        className="relative flex items-center gap-0 md:gap-8"
                                                                >
                                                                        {/* Left card — desktop only, odd steps */}
                                                                        <div className="hidden md:flex flex-1 justify-end">
                                                                                {!isRight && (
                                                                                        <motion.div
                                                                                                initial={{ opacity: 0, x: -60 }}
                                                                                                whileInView={{ opacity: 1, x: 0 }}
                                                                                                viewport={{ once: true, margin: "-40px" }}
                                                                                                transition={{ duration: 0.65, delay: 0.2, ease }}
                                                                                        >
                                                                                                <StepCard step={step} Icon={Icon} />
                                                                                        </motion.div>
                                                                                )}
                                                                        </div>

                                                                        {/* Timeline node */}
                                                                        <PopIn delay={i * 0.15} className="relative z-10 shrink-0">
                                                                                <div className="relative flex items-center justify-center">
                                                                                        {/* Ping ring */}
                                                                                        <div className="absolute w-10 h-10 rounded-full border border-zinc-600/40 animate-ping-slow" />
                                                                                        <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center shadow-lg shadow-black/50 z-10">
                                                                                                <span className="text-xs font-bold font-mono text-zinc-300">
                                                                                                        {step.number}
                                                                                                </span>
                                                                                        </div>
                                                                                </div>
                                                                        </PopIn>

                                                                        {/* Right card — desktop only, even steps */}
                                                                        <div className="hidden md:flex flex-1 justify-start">
                                                                                {isRight && (
                                                                                        <motion.div
                                                                                                initial={{ opacity: 0, x: 60 }}
                                                                                                whileInView={{ opacity: 1, x: 0 }}
                                                                                                viewport={{ once: true, margin: "-40px" }}
                                                                                                transition={{ duration: 0.65, delay: 0.2, ease }}
                                                                                        >
                                                                                                <StepCard step={step} Icon={Icon} />
                                                                                        </motion.div>
                                                                                )}
                                                                        </div>

                                                                        {/* Mobile — always after node */}
                                                                        <motion.div
                                                                                className="md:hidden flex-1 pl-4"
                                                                                initial={{ opacity: 0, x: 30 }}
                                                                                whileInView={{ opacity: 1, x: 0 }}
                                                                                viewport={{ once: true, margin: "-40px" }}
                                                                                transition={{ duration: 0.55, delay: 0.15, ease }}
                                                                        >
                                                                                <StepCard step={step} Icon={Icon} mobile />
                                                                        </motion.div>
                                                                </div>
                                                        )
                                                })}
                                        </div>
                                </div>
                        </div>
                </section>
        )
}

type Step = (typeof steps)[number]

function StepCard({
        step,
        Icon,
        mobile = false,
}: {
        step: Step
        Icon: React.ElementType
        mobile?: boolean
}) {
        return (
                <div
                        className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 backdrop-blur-sm hover:border-zinc-600 transition-colors duration-300 ${
                                mobile ? "w-full" : "max-w-xs lg:max-w-sm w-full"
                        }`}
                >
                        {/* Hover shimmer sweep */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none" />

                        {/* Giant background step number */}
                        <span className="pointer-events-none absolute -right-3 -bottom-5 text-[7rem] font-black leading-none select-none text-white/[0.04]">
                                {step.number}
                        </span>

                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                <Icon className="w-5 h-5 text-white" />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-5">{step.description}</p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                                {step.tags.map((tag, i) => (
                                        <motion.span
                                                key={tag}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
                                                className="px-2.5 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-300 font-medium"
                                        >
                                                {tag}
                                        </motion.span>
                                ))}
                        </div>
                </div>
        )
}
