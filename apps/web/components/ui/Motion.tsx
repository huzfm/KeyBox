"use client"

import { motion, type Variants } from "framer-motion"

const ease = [0.21, 0.47, 0.32, 0.98] as const

// ── Fade up ──────────────────────────────────────────────────────────────────
export function FadeUp({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.65, delay, ease }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

// ── Fade in ───────────────────────────────────────────────────────────────────
export function FadeIn({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.6, delay }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

// ── Slide from left ───────────────────────────────────────────────────────────
export function SlideLeft({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.65, delay, ease }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

// ── Slide from right ──────────────────────────────────────────────────────────
export function SlideRight({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.65, delay, ease }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

// ── Scale in ──────────────────────────────────────────────────────────────────
export function ScaleIn({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, scale: 0.88 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.55, delay, ease }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

// ── Stagger container + item ──────────────────────────────────────────────────
const containerVariants: Variants = {
        hidden: {},
        visible: (stagger: number) => ({
                transition: { staggerChildren: stagger },
        }),
}

const itemVariants: Variants = {
        hidden: { opacity: 0, y: 32 },
        visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
        },
}

export function StaggerContainer({
        children,
        stagger = 0.08,
        className = "",
}: {
        children: React.ReactNode
        stagger?: number
        className?: string
}) {
        return (
                <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-60px" }}
                        custom={stagger}
                        variants={containerVariants}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}

export function StaggerItem({
        children,
        className = "",
}: {
        children: React.ReactNode
        className?: string
}) {
        return (
                <motion.div variants={itemVariants} className={className}>
                        {children}
                </motion.div>
        )
}

// ── Pop spring (for nodes/badges) ─────────────────────────────────────────────
export function PopIn({
        children,
        delay = 0,
        className = "",
}: {
        children: React.ReactNode
        delay?: number
        className?: string
}) {
        return (
                <motion.div
                        initial={{ opacity: 0, scale: 0.4 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ type: "spring", stiffness: 400, damping: 20, delay }}
                        className={className}
                >
                        {children}
                </motion.div>
        )
}
