"use client"

import { useMemo, useEffect, useState, useRef, Suspense } from "react"
import { motion, AnimatePresence, animate } from "framer-motion"
import {
	useCreateClient,
	useCreateProject,
	useDashboard,
	useToggleLicense,
	useRenewLicense,
} from "@/lib/queries"
import CreateClient from "@/components/dashboard/CreateClient"
import CreateProject from "@/components/dashboard/CreateProject"
import ClientsTree from "@/components/dashboard/ClientsTree"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	LogOut,
	Users,
	Key,
	Shield,
} from "lucide-react"
import Cookies from "js-cookie"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

interface License {
	_id: string
	key: string
	status: "ACTIVE" | "PENDING" | "REVOKED" | "EXPIRED"
	duration: number
	issuedAt: string | Date
	expiresAt: string | Date
}

interface Project {
	_id: string
	name: string
	licenses?: License[]
}

interface Client {
	_id: string
	name: string
	email?: string
	projects?: Project[]
}

const ease = [0.21, 0.47, 0.32, 0.98] as const

const STAT_ACCENTS = {
	neutral: { num: "text-white", dot: "bg-zinc-500" },
	violet: { num: "text-white", dot: "bg-violet-400" },
	emerald: { num: "text-emerald-400", dot: "bg-emerald-400" },
	amber: { num: "text-amber-400", dot: "bg-amber-400" },
	rose: { num: "text-rose-400", dot: "bg-rose-400" },
} as const

interface StatCellProps {
	label: string
	value: number
	accent: keyof typeof STAT_ACCENTS
	delay: number
	className?: string
}

function useCountUp(value: number) {
	const [display, setDisplay] = useState(0)
	const prev = useRef(0)
	useEffect(() => {
		const controls = animate(prev.current, value, {
			duration: 0.9,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (v) => setDisplay(Math.round(v)),
		})
		prev.current = value
		return () => controls.stop()
	}, [value])
	return display
}

function StatCell({ label, value, accent, delay, className = "" }: StatCellProps) {
	const a = STAT_ACCENTS[accent]
	const display = useCountUp(value)
	return (
		<div className={`bg-zinc-950/90 px-5 py-4 hover:bg-zinc-900/80 transition-colors duration-200 ${className}`}>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45, delay, ease }}
			>
				<div className="flex items-center gap-1.5">
					<span className={`h-1.5 w-1.5 rounded-full shrink-0 ${a.dot}`} />
					<p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold whitespace-nowrap">
						{label}
					</p>
				</div>
				<p className={`text-2xl sm:text-3xl font-bold font-mono leading-none tabular-nums mt-2.5 ${a.num}`}>
					{display}
				</p>
			</motion.div>
		</div>
	)
}

function DashboardContent() {
	const { data: clients = [], isLoading, isError, error } = useDashboard()
	const createClient = useCreateClient()
	const createProject = useCreateProject()
	const toggleLicense = useToggleLicense()
	const renewLicense = useRenewLicense()
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isChecking, setIsChecking] = useState(true)
	const [tokenProcessed, setTokenProcessed] = useState(false)

	useEffect(() => {
		const token = searchParams.get("token")
		if (token) {
			const expiryDate = new Date(Date.now() + 30 * 60 * 1000)
			Cookies.set("jwt", token, {
				expires: expiryDate,
				sameSite: "strict",
			})
			setTokenProcessed(true)
			router.replace("/dashboard")
		} else {
			setTokenProcessed(true)
		}
	}, [searchParams, router])

	const isAuthorized = useMemo(() => {
		if (!tokenProcessed) return false
		const jwt = Cookies.get("jwt")
		return !!jwt
	}, [tokenProcessed])

	const userInfo = useMemo(() => {
		try {
			const jwt = Cookies.get("jwt")
			if (!jwt) return { name: null, email: null }
			const payload = JSON.parse(atob(jwt.split(".")[1]))
			return {
				name: payload.name || payload.username || null,
				email: payload.email || payload.sub || null,
			}
		} catch {
			return { name: null, email: null }
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tokenProcessed])

	useEffect(() => {
		if (tokenProcessed) {
			setIsChecking(false)
		}
	}, [tokenProcessed])

	const stats = useMemo(() => {
		const typedClients = clients as Client[]
		const totalClients = typedClients.length
		const totalProjects = typedClients.reduce((acc, c) => acc + (c.projects?.length ?? 0), 0)
		let active = 0, revoked = 0, expired = 0, pending = 0
		for (const client of typedClients) {
			for (const project of client.projects ?? []) {
				for (const license of project.licenses ?? []) {
					if (license.status === "ACTIVE") active++
					else if (license.status === "REVOKED") revoked++
					else if (license.status === "EXPIRED") expired++
					else if (license.status === "PENDING") pending++
				}
			}
		}
		return { totalClients, totalProjects, active, revoked, expired, pending }
	}, [clients])

	const handleLogout = () => {
		Cookies.remove("jwt")
		router.push("/login")
	}

	if (isChecking) {
		return (
			<div className="min-h-screen bg-zinc-950 flex items-center justify-center">
				<motion.div
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ duration: 1.5, repeat: Infinity }}
					className="text-zinc-500 font-mono text-sm"
				>
					Loading...
				</motion.div>
			</div>
		)
	}

	const isUnauthorized =
		isError &&
		(error as unknown as { response: { status: number } })?.response?.status === 401

	if (!isAuthorized || isUnauthorized) {
		return (
			<div className="min-h-screen bg-zinc-950 relative flex items-center justify-center">
				<div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease }}
					className="relative z-10 text-center px-4"
				>
					<div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
						<Shield className="w-8 h-8 text-zinc-500" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
						{isUnauthorized ? "Session Expired" : "Access Denied"}
					</h1>
					<p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
						{isUnauthorized
							? "Your session has expired. Please log in again to continue managing your dashboard."
							: "You need to be logged in to access the dashboard. Please sign in with your developer account."}
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link href="/login">
							<Button className="bg-white text-black hover:bg-zinc-200 font-medium px-6">
								Log In
							</Button>
						</Link>
						<Link href="/">
							<Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
								Go to Home
							</Button>
						</Link>
					</div>
				</motion.div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-zinc-950 relative">
			{/* Grid background */}
			<div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

			{/* Top glow */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none rounded-full bg-white/[0.03] blur-3xl" />

			{/* ── HEADER ── */}
			<header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
					<div className="flex items-center justify-between gap-3">
						{/* Logo + subtitle */}
						<div className="flex items-center gap-3 min-w-0">
							<Link href="/">
								<motion.div
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									className="font-bold font-mono text-lg text-white bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-1.5 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-shadow duration-300"
								>
									KeyBox
								</motion.div>
							</Link>
							<span className="hidden sm:block text-zinc-600 text-sm">
								/ Dashboard
							</span>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-2 sm:gap-3">
							<Link href="/sdk-usage">
								<Button
									size="sm"
									className="bg-white/10 border border-white/10 text-white hover:bg-white/15 hover:border-white/20 backdrop-blur-sm text-xs sm:text-sm"
								>
									SDK Usage
								</Button>
							</Link>

							{/* User avatar dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-semibold text-sm hover:bg-zinc-700 hover:border-zinc-600 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-zinc-500"
									>
										{userInfo.email ? userInfo.email.charAt(0).toUpperCase() : "U"}
									</motion.button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									sideOffset={8}
									className="w-56 p-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl"
								>
									<div className="px-3 py-2.5">
										<p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
											Signed in as
										</p>
										<p className="text-sm text-white font-medium mt-0.5 truncate">
											{userInfo.email || "user@example.com"}
										</p>
									</div>
									<DropdownMenuSeparator className="bg-zinc-800 my-1" />
									<DropdownMenuItem
										onClick={handleLogout}
										className="flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-sm"
									>
										<LogOut className="h-4 w-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

				{/* ── PAGE TITLE ── */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease }}
				>
					<h1 className="text-2xl sm:text-3xl font-bold text-white font-mono">
						License Management
					</h1>
					<p className="text-zinc-500 text-sm mt-1">
						Generate, validate, and manage software licenses for your clients.
					</p>
				</motion.div>

				{/* ── STATS STRIP ── */}
				<AnimatePresence>
					{!isLoading && (
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, ease }}
							className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-2xl border border-zinc-800 bg-zinc-800/70 overflow-hidden backdrop-blur-sm"
						>
							<StatCell
								label="Total Clients"
								value={stats.totalClients}
								accent="neutral"
								delay={0.05}
							/>
							<StatCell
								label="Projects"
								value={stats.totalProjects}
								accent="violet"
								delay={0.1}
							/>
							<StatCell
								label="Active"
								value={stats.active}
								accent="emerald"
								delay={0.15}
							/>
							<StatCell
								label="Pending"
								value={stats.pending}
								accent="amber"
								delay={0.2}
							/>
							<StatCell
								label="Revoked / Expired"
								value={stats.revoked + stats.expired}
								accent="rose"
								delay={0.25}
								className="col-span-2 sm:col-span-2 lg:col-span-1"
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{/* ── CREATE FORMS ── */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2, ease }}
				>
					<div className="flex items-center gap-3 mb-4">
						<Key className="w-4 h-4 text-zinc-500" />
						<h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
							Create
						</h2>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<motion.div
							initial={{ opacity: 0, x: -16 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.45, delay: 0.25, ease }}
						>
							<CreateClient onCreate={createClient.mutateAsync} />
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: 16 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.45, delay: 0.3, ease }}
						>
							<CreateProject clients={clients as Client[]} onCreate={createProject.mutateAsync} />
						</motion.div>
					</div>
				</motion.div>

				{/* ── CLIENTS TREE ── */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.35, ease }}
				>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<Users className="w-4 h-4 text-zinc-500" />
							<h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
								Clients & Projects
							</h2>
						</div>
						{!isLoading && (
							<span className="text-xs text-zinc-600 font-mono">
								{stats.totalClients} client{stats.totalClients !== 1 ? "s" : ""}
							</span>
						)}
					</div>

					{isLoading ? (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<motion.div
									key={i}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.3, delay: i * 0.08 }}
								>
									<Skeleton className="h-20 rounded-xl bg-zinc-900" />
								</motion.div>
							))}
						</div>
					) : (
						<ClientsTree
							clients={clients}
							onToggle={toggleLicense.mutate}
							onRenew={(key, duration) =>
								renewLicense.mutate({ key, duration })
							}
						/>
					)}
				</motion.div>
			</div>
		</div>
	)
}

export default function DashboardClient() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-zinc-950 flex items-center justify-center">
					<motion.div
						animate={{ opacity: [0.4, 1, 0.4] }}
						transition={{ duration: 1.5, repeat: Infinity }}
						className="text-zinc-500 font-mono text-sm"
					>
						Loading dashboard...
					</motion.div>
				</div>
			}
		>
			<DashboardContent />
		</Suspense>
	)
}
