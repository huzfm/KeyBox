"use client"

import { motion, AnimatePresence, animate } from "framer-motion"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { ArrowRight, CheckCircle2, XCircle, Clock, KeyRound, RefreshCw, Lock, Zap, Globe, MousePointer2 } from "lucide-react"

const ease = [0.21, 0.47, 0.32, 0.98] as const

/* ─── Animated headline ─── */
function AnimatedHeadline() {
	const lines = [
		{ text: "Secure license", accent: false },
		{ text: "management", accent: false },
		{ text: "for your software.", accent: true },
	] as const

	return (
		<div className="space-y-0.5">
			{lines.map((line, i) => (
				<motion.h1
					key={i}
					initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					transition={{ duration: 0.8, delay: 0.15 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
					className={`block font-mono text-4xl sm:text-5xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.1] ${
						line.accent ? "hero-gradient-text" : "text-white"
					}`}
				>
					{line.text}
				</motion.h1>
			))}
		</div>
	)
}

/* ─── Feature pills ─── */
function FeaturePills() {
	const features = [
		{ icon: <Lock className="w-3 h-3" />,     text: "Machine-bound"  },
		{ icon: <RefreshCw className="w-3 h-3" />, text: "Auto-renewing" },
		{ icon: <Zap className="w-3 h-3" />,        text: "One SDK call"  },
		{ icon: <Globe className="w-3 h-3" />,      text: "Zero redeploy" },
	]
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 1.2, ease }}
			className="flex flex-wrap gap-2"
		>
			{features.map((f, i) => (
				<span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 font-medium">
					<span className="text-zinc-500">{f.icon}</span>
					{f.text}
				</span>
			))}
		</motion.div>
	)
}

/* ─── Product mockup ─── */
const seedRows = [
	{ id: 1, client: "Acme Corp",    project: "ProTracker", key: "KB-A3F9", status: "ACTIVE",  pct: 68 },
	{ id: 2, client: "Nexus Labs",   project: "BuildBot",   key: "KB-C12E", status: "REVOKED", pct: 0  },
	{ id: 3, client: "Orbit Media",  project: "CMS Pro",    key: "KB-77F1", status: "ACTIVE",  pct: 91 },
]

function CountUp({ value, className }: { value: number; className?: string }) {
	const [display, setDisplay] = useState(0)
	const prev = useRef(0)

	useEffect(() => {
		const controls = animate(prev.current, value, {
			duration: 0.7,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: v => setDisplay(Math.round(v)),
		})
		prev.current = value
		return () => controls.stop()
	}, [value])

	return <span className={className}>{display}</span>
}

function StatusPill({ status }: { status: string }) {
	const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
		ACTIVE:  { cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <span className="relative flex"><span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow opacity-75" /><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /></span> },
		REVOKED: { cls: "text-red-400 bg-red-400/10 border-red-400/20",             icon: <XCircle className="w-3 h-3" /> },
		PENDING: { cls: "text-zinc-400 bg-zinc-400/10 border-zinc-700",             icon: <Clock className="w-3 h-3" /> },
	}
	const { cls, icon } = cfg[status] ?? cfg.PENDING
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${cls}`}>
			{icon}{status}
		</span>
	)
}

const activityLog = [
	"Validating machine ID…",
	"SHA-256 fingerprint verified",
	"Polling next in 15 min",
	"Checking license scope…",
	"Heartbeat received",
]

const terminalLines = [
	"$ node app.js",
	"",
	"[KeyBox] Activating license...",
	"[KeyBox] Machine ID bound ✓",
	"[KeyBox] License ACTIVE",
]

function TerminalWindow() {
	const [lineIndex, setLineIndex] = useState(0)
	const [charIndex, setCharIndex] = useState(0)

	useEffect(() => {
		if (lineIndex >= terminalLines.length) {
			const t = setTimeout(() => { setLineIndex(0); setCharIndex(0) }, 2400)
			return () => clearTimeout(t)
		}
		const line = terminalLines[lineIndex]
		if (charIndex < line.length) {
			const t = setTimeout(() => setCharIndex(c => c + 1), 28)
			return () => clearTimeout(t)
		}
		const t = setTimeout(() => { setLineIndex(l => l + 1); setCharIndex(0) }, 380)
		return () => clearTimeout(t)
	}, [lineIndex, charIndex])

	return (
		<motion.div
			initial={{ opacity: 0, y: 24, rotate: -5 }}
			animate={{ opacity: 1, y: 0, rotate: -3 }}
			transition={{ duration: 0.9, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
			className="absolute -bottom-8 -left-6 lg:-left-10 z-30 w-[195px] sm:w-[220px] rounded-xl border border-zinc-800 bg-black/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden"
		>
			<div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/70 bg-white/[0.02]">
				<div className="w-2 h-2 rounded-full bg-red-500/50" />
				<div className="w-2 h-2 rounded-full bg-amber-500/50" />
				<div className="w-2 h-2 rounded-full bg-emerald-500/50" />
				<span className="ml-1.5 text-[9px] text-zinc-600 font-mono truncate">activate.js</span>
			</div>
			<div className="p-3 font-mono text-[9.5px] leading-relaxed min-h-[74px]">
				{terminalLines.slice(0, lineIndex).map((l, i) => (
					<p key={i} className={l.startsWith("[KeyBox]") ? "text-emerald-400" : "text-zinc-400"}>
						{l || " "}
					</p>
				))}
				{lineIndex < terminalLines.length && (
					<p className={terminalLines[lineIndex].startsWith("[KeyBox]") ? "text-emerald-400" : "text-zinc-400"}>
						{terminalLines[lineIndex].slice(0, charIndex)}
						<span className="inline-block w-1.5 h-3 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
					</p>
				)}
			</div>
		</motion.div>
	)
}

function ProductMockup() {
	const [rows, setRows] = useState(seedRows)
	const [toast, setToast] = useState<string | null>(null)
	const [busy, setBusy] = useState<number | null>(null)
	const [activityIndex, setActivityIndex] = useState(0)

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

	useEffect(() => {
		const id = setInterval(() => setActivityIndex(i => (i + 1) % activityLog.length), 2200)
		return () => clearInterval(id)
	}, [])

	return (
		<div className="relative w-full animate-float">
			{/* Glow halos */}
			<div className="absolute -inset-10 bg-white/[0.025] blur-3xl rounded-full pointer-events-none" />
			<div className="absolute -inset-6 bg-violet-500/[0.06] blur-3xl rounded-3xl pointer-events-none" />

			<motion.div
				initial={{ opacity: 0, x: 50, scale: 0.95 }}
				animate={{ opacity: 1, x: 0,  scale: 1    }}
				transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
				className="relative rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_100px_rgba(0,0,0,0.85)]"
			>
				{/* Ambient glint sweep */}
				<div className="absolute inset-0 opacity-30 animate-shimmer pointer-events-none z-20" />

				{/* Chrome bar */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/70 bg-white/[0.015]">
					<div className="flex gap-1.5">
						<div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
						<div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
						<div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
					</div>
					<div className="flex-1 bg-white/[0.04] rounded px-3 py-0.5 text-[10px] text-zinc-500 font-mono text-center">
						app.keybox.dev/dashboard
					</div>
				</div>

				<div className="p-4 lg:p-3.5 space-y-3 lg:space-y-2.5">
					{/* Dash header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
								<KeyRound className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
							</div>
							<div>
								<p className="text-white text-sm font-bold font-mono leading-none">KeyBox</p>
								<div className="h-[11px] mt-0.5 overflow-hidden">
									<AnimatePresence mode="wait">
										<motion.p
											key={activityIndex}
											initial={{ y: 8, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											exit={{ y: -8, opacity: 0 }}
											transition={{ duration: 0.3, ease }}
											className="text-zinc-600 text-[9px] font-mono whitespace-nowrap"
										>
											{activityLog[activityIndex]}
										</motion.p>
									</AnimatePresence>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="relative flex">
								<span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow opacity-75" />
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
							</span>
							<span className="text-[10px] text-zinc-500 font-mono ml-1">Live</span>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-3 gap-2">
						{[
							{ label: "Total",   value: 12, color: "text-zinc-300"  },
							{ label: "Active",  value: rows.filter(r => r.status === "ACTIVE").length,  color: "text-emerald-400" },
							{ label: "Revoked", value: rows.filter(r => r.status === "REVOKED").length, color: "text-red-400" },
						].map(s => (
							<div key={s.label} className="bg-zinc-900/70 border border-zinc-800/70 rounded-xl px-3 py-1.5 lg:py-1">
								<CountUp value={s.value} className={`block text-base font-bold font-mono ${s.color}`} />
								<p className="text-[9px] text-zinc-600 mt-0.5">{s.label}</p>
							</div>
						))}
					</div>

					{/* Rows */}
					<div className="rounded-xl border border-zinc-800/70 overflow-hidden">
						<div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-white/[0.02] px-3 py-1.5 lg:py-1 border-b border-zinc-800/70">
							{["Client", "Key", "Status"].map(h => (
								<span key={h} className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">{h}</span>
							))}
						</div>
						{rows.map((row, i) => (
							<motion.div
								key={row.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.9 + i * 0.1, ease }}
								className="relative grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-3 py-2 lg:py-1.5 border-b border-zinc-800/50 last:border-0 hover:bg-white/[0.02] transition-colors"
							>
								<div>
									<p className="text-[11px] text-zinc-300 font-medium truncate">{row.client}</p>
									<p className="text-[9px] text-zinc-600 truncate">{row.project}</p>
								</div>
								<span className="text-[10px] text-zinc-500 font-mono">
									{row.key}<span className="text-zinc-700">-••••</span>
								</span>
								{busy === row.id
									? <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />
									: <StatusPill status={row.status} />
								}

								{/* Simulated cursor click */}
								<AnimatePresence>
									{busy === row.id && (
										<motion.div
											initial={{ opacity: 0, x: 18, y: -12, scale: 0.85 }}
											animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
											exit={{ opacity: 0, scale: 0.7 }}
											transition={{ duration: 0.35, ease }}
											className="absolute right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none"
										>
											<span className="absolute -inset-2 rounded-full bg-white/30 animate-ping-slow" />
											<MousePointer2 className="w-3.5 h-3.5 text-white relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" fill="white" strokeWidth={1.5} />
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						))}
					</div>

					{/* Progress bars */}
					<div className="space-y-2 lg:space-y-1.5">
						{rows.filter(r => r.status === "ACTIVE" && r.pct > 0).map(r => (
							<div key={r.id}>
								<div className="flex justify-between text-[9px] text-zinc-600 mb-1">
									<span>{r.client}</span>
									<span>{r.pct}%</span>
								</div>
								<div className="relative h-[3px] bg-zinc-900 rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${r.pct}%` }}
										transition={{ duration: 1.5, delay: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
										className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-400"
									/>
									<motion.div
										initial={{ left: "-10%" }}
										animate={{ left: "100%" }}
										transition={{ duration: 2.2, delay: 3 + r.id * 0.4, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
										className="absolute inset-y-0 w-5 bg-white/60 blur-[2px] rounded-full"
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</motion.div>

			{/* Floating terminal window */}
			<TerminalWindow />

			{/* Toast */}
			<AnimatePresence>
				{toast && (
					<motion.div
						key={toast}
						initial={{ opacity: 0, y: -12, scale: 0.92 }}
						animate={{ opacity: 1, y: 0,  scale: 1    }}
						exit={  { opacity: 0, y: 8,  scale: 0.92 }}
						transition={{ duration: 0.3, ease }}
						className="absolute -top-5 right-2 z-40 flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-black/90 backdrop-blur-xl text-xs font-semibold text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] whitespace-nowrap"
					>
						<CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
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

			{/* Grid background */}
			<div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:35px_35px]" />

			{/* Bottom fade */}
			<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

			{/* Content */}
			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 pt-24 pb-10 lg:pt-20 lg:pb-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">

				{/* LEFT */}
				<div className="flex flex-col gap-5 lg:gap-3.5 items-start">

					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0   }}
						transition={{ duration: 0.6, ease }}
						className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl text-xs font-medium text-zinc-400"
					>
						<span className="relative flex">
							<span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow opacity-75" />
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
						</span>
						Open source · Free to start · v1.0.0
					</motion.div>

					{/* Headline */}
					<AnimatedHeadline />

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.65, ease }}
						className="text-zinc-400 text-base lg:text-sm max-w-md leading-relaxed"
					>
						Generate, activate, and revoke software licenses with one SDK call.
						Machine-bound. Auto-renewing. Zero redeploy.
					</motion.p>

					{/* Feature pills */}
					<FeaturePills />

					{/* CTAs */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0   }}
						transition={{ duration: 0.6, delay: 1.4, ease }}
						className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
					>
						<Link href={isLoggedIn ? "/dashboard" : "/signup"}>
							<motion.button
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.97 }}
								className="group relative flex items-center gap-2.5 px-7 py-3 lg:py-2.5 rounded-xl text-sm font-bold text-black overflow-hidden bg-slate-100 shadow-[0_0_35px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.55)] transition-shadow duration-300"
							>
								<span className="relative z-10 flex items-center gap-2.5">
									{isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
									<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
								</span>
								<span className="absolute inset-0 animate-shimmer pointer-events-none" />
							</motion.button>
						</Link>
						<Link href="/sdk-usage">
							<motion.button
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.97 }}
								className="px-7 py-3 lg:py-2.5 rounded-xl text-sm font-semibold text-white bg-transparent border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 transition-all duration-200"
							>
								View SDK Docs
							</motion.button>
						</Link>
					</motion.div>

					{/* SDK tags */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 1.65 }}
						className="flex items-center gap-3 text-[11px] text-zinc-600 font-mono"
					>
						{["Node.js", "Python", ".NET"].map((s, i) => (
							<span key={s} className="flex items-center gap-3">
								{i > 0 && <span className="w-px h-3 bg-zinc-800 block" />}
								{s}
							</span>
						))}
					</motion.div>
				</div>

				{/* RIGHT */}
				<ProductMockup />
			</div>
		</section>
	)
}
