"use client"

import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowRight, CheckCircle2, XCircle, Clock, KeyRound, RefreshCw, Shield } from "lucide-react"

const ease = [0.21, 0.47, 0.32, 0.98] as const

/* ─── Animated headline words ─── */
function AnimatedHeadline() {
	const lines = [
		["Secure", "license"],
		["management"],
		["for your", "software."],
	]

	let wordIndex = 0

	return (
		<h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] font-extrabold tracking-[-0.04em] leading-[1.05] text-white">
			{lines.map((line, li) => (
				<span key={li} className="block">
					{line.map((word) => {
						const delay = 0.18 + wordIndex++ * 0.13
						const isLast = word === "software."
						return (
							<motion.span
								key={word}
								initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
								animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
								transition={{ duration: 0.8, delay, ease }}
								className={`inline-block mr-4 ${isLast ? "text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-500" : ""}`}
							>
								{word}
							</motion.span>
						)
					})}
				</span>
			))}
		</h1>
	)
}

/* ─── Animated subtitle characters ─── */
function AnimatedSubtitle() {
	const text = "Generate, activate, and revoke software licenses with one SDK call. Machine-bound. Auto-renewing. Zero redeploy."
	const words = text.split(" ")

	return (
		<p className="text-zinc-500 text-base sm:text-lg max-w-md leading-relaxed">
			{words.map((word, i) => (
				<motion.span
					key={i}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 1.1 + i * 0.04, ease }}
					className="inline-block mr-[0.3em]"
				>
					{word}
				</motion.span>
			))}
		</p>
	)
}

/* ─── Product mockup ─── */
const seedRows = [
	{ id: 1, client: "Acme Corp",    project: "ProTracker", key: "KB-A3F9", status: "ACTIVE",  pct: 68 },
	{ id: 2, client: "Nexus Labs",   project: "BuildBot",   key: "KB-C12E", status: "REVOKED", pct: 0  },
	{ id: 3, client: "Orbit Media",  project: "CMS Pro",    key: "KB-77F1", status: "ACTIVE",  pct: 91 },
	{ id: 4, client: "Stackify Inc", project: "DataVault",  key: "KB-B44A", status: "PENDING", pct: 0  },
]

function StatusPill({ status }: { status: string }) {
	const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
		ACTIVE:  { cls: "text-white bg-white/10 border-white/20",       icon: <span className="w-1.5 h-1.5 rounded-full bg-white" /> },
		REVOKED: { cls: "text-zinc-500 bg-zinc-500/10 border-zinc-700", icon: <XCircle className="w-3 h-3" /> },
		PENDING: { cls: "text-zinc-400 bg-zinc-400/10 border-zinc-700", icon: <Clock className="w-3 h-3" /> },
	}
	const { cls, icon } = cfg[status] ?? cfg.PENDING
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${cls}`}>
			{icon}{status}
		</span>
	)
}

function ProductMockup() {
	const [rows, setRows] = useState(seedRows)
	const [toast, setToast] = useState<string | null>(null)
	const [busy, setBusy] = useState<number | null>(null)

	useEffect(() => {
		let step = 0
		const tick = () => {
			setBusy(2)
			setTimeout(() => {
				const next = step % 2 === 0 ? "ACTIVE" : "REVOKED"
				const pct  = step % 2 === 0 ? 45 : 0
				setRows(r => r.map(x => x.id === 2 ? { ...x, status: next, pct } : x))
				setBusy(null)
				setToast(next === "ACTIVE" ? "License activated" : "License revoked")
				setTimeout(() => setToast(null), 2000)
				step++
			}, 900)
		}
		const id = setInterval(tick, 4200)
		return () => clearInterval(id)
	}, [])

	return (
		<div className="relative w-full">
			{/* Subtle glow */}
			<div className="absolute inset-0 bg-white/[0.03] blur-3xl scale-110 rounded-3xl pointer-events-none" />

			<motion.div
				initial={{ opacity: 0, x: 50, scale: 0.97 }}
				animate={{ opacity: 1, x: 0,  scale: 1    }}
				transition={{ duration: 1.0, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
				className="relative rounded-2xl border border-white/[0.08] bg-zinc-950/95 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_100px_rgba(0,0,0,0.8)]"
			>
				{/* Chrome */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
					<div className="flex gap-1.5">
						<div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
						<div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
						<div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
					</div>
					<div className="flex-1 bg-white/[0.04] rounded px-3 py-0.5 text-[10px] text-zinc-600 font-mono text-center">
						app.keybox.dev/dashboard
					</div>
				</div>

				<div className="p-5 space-y-4">
					{/* Dash header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-white/[0.07] border border-white/[0.08] flex items-center justify-center">
								<KeyRound className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
							</div>
							<div>
								<p className="text-white text-sm font-bold font-mono leading-none">KeyBox</p>
								<p className="text-zinc-600 text-[9px] mt-0.5">License Dashboard</p>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<Shield className="w-3 h-3 text-zinc-500" />
							<span className="text-[10px] text-zinc-600 font-mono">Protected</span>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-3 gap-2">
						{[
							{ label: "Total",   value: "12", bright: false },
							{ label: "Active",  value: String(rows.filter(r => r.status === "ACTIVE").length),  bright: true  },
							{ label: "Revoked", value: String(rows.filter(r => r.status === "REVOKED").length), bright: false },
						].map(s => (
							<div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2">
								<p className={`text-base font-bold font-mono ${s.bright ? "text-white" : "text-zinc-500"}`}>{s.value}</p>
								<p className="text-[9px] text-zinc-600 mt-0.5">{s.label}</p>
							</div>
						))}
					</div>

					{/* Rows */}
					<div className="rounded-xl border border-white/[0.05] overflow-hidden">
						<div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-white/[0.02] px-3 py-2 border-b border-white/[0.05]">
							{["Client", "Key", "Status"].map(h => (
								<span key={h} className="text-[9px] text-zinc-700 uppercase tracking-widest font-semibold">{h}</span>
							))}
						</div>
						{rows.map((row, i) => (
							<motion.div
								key={row.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.9 + i * 0.1, ease }}
								className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-3 py-2.5 border-b border-white/[0.04] last:border-0"
							>
								<div>
									<p className="text-[11px] text-zinc-300 font-medium truncate">{row.client}</p>
									<p className="text-[9px] text-zinc-700 truncate">{row.project}</p>
								</div>
								<span className="text-[10px] text-zinc-700 font-mono">
									{row.key}-<span className="text-zinc-800">••••</span>
								</span>
								{busy === row.id
									? <RefreshCw className="w-3 h-3 text-zinc-600 animate-spin" />
									: <StatusPill status={row.status} />
								}
							</motion.div>
						))}
					</div>

					{/* Progress bars */}
					<div className="space-y-2.5">
						{rows.filter(r => r.status === "ACTIVE" && r.pct > 0).map(r => (
							<div key={r.id}>
								<div className="flex justify-between text-[9px] text-zinc-700 mb-1.5">
									<span>{r.client}</span>
									<span>{r.pct}%</span>
								</div>
								<div className="h-[3px] bg-zinc-900 rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${r.pct}%` }}
										transition={{ duration: 1.5, delay: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
										className="h-full rounded-full bg-white/60"
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</motion.div>

			{/* Toast */}
			<AnimatePresence>
				{toast && (
					<motion.div
						key={toast}
						initial={{ opacity: 0, y: 12, scale: 0.92 }}
						animate={{ opacity: 1, y: 0,  scale: 1    }}
						exit={  { opacity: 0, y: -8,  scale: 0.92 }}
						transition={{ duration: 0.3, ease }}
						className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl text-xs font-semibold text-white shadow-2xl whitespace-nowrap"
					>
						<CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
						{toast}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

/* ─── Main hero ─── */
export default function HeroClient({ isLoggedIn }: { isLoggedIn: boolean }) {
	return (
		<section className="relative min-h-svh flex items-center overflow-hidden bg-black">

			{/* Grid */}
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

			{/* Very subtle top glow */}
			<div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04)_0%,transparent_70%)]" />

			{/* Noise */}
			<div className="pointer-events-none absolute inset-0 hero-noise opacity-[0.3]" />

			{/* Edge vignette */}
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_50%,rgba(0,0,0,0.6)_100%)]" />

			{/* Bottom fade */}
			<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black to-transparent" />

			{/* Split layout */}
			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 pt-28 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

				{/* LEFT — animated text */}
				<div className="flex flex-col gap-8 items-start">

					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0   }}
						transition={{ duration: 0.6, ease }}
						className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] text-[11px] font-semibold text-zinc-400"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
						Open source · Free to start · v1.0.0
					</motion.div>

					{/* Animated headline */}
					<AnimatedHeadline />

					{/* Animated subtitle */}
					<AnimatedSubtitle />

					{/* CTAs */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0   }}
						transition={{ duration: 0.6, delay: 1.6, ease }}
						className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
					>
						<Link href={isLoggedIn ? "/dashboard" : "/signup"}>
							<motion.button
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.97 }}
								className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold text-black bg-white shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_70px_rgba(255,255,255,0.45)] transition-shadow duration-300"
							>
								{isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
								<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
							</motion.button>
						</Link>
						<Link href="/sdk-usage">
							<motion.button
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.97 }}
								className="px-7 py-3.5 rounded-xl text-sm font-semibold text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-all duration-200"
							>
								View SDK Docs
							</motion.button>
						</Link>
					</motion.div>

					{/* SDK tags */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 1.9 }}
						className="flex items-center gap-3 text-[11px] text-zinc-700 font-mono"
					>
						{["Node.js", "Python", ".NET"].map((s, i) => (
							<span key={s} className="flex items-center gap-3">
								{i > 0 && <span className="w-px h-3 bg-zinc-800 block" />}
								{s}
							</span>
						))}
					</motion.div>
				</div>

				{/* RIGHT — product mockup */}
				<ProductMockup />
			</div>
		</section>
	)
}
