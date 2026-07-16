import Link from "next/link"
import { Github, KeyRound } from "lucide-react"
import { cookies } from "next/headers"

export default async function HomeNavbar() {
	const cookieStore = await cookies()
	const isLoggedIn = cookieStore.get("jwt")

	return (
		<header className="fixed top-0 left-0 right-0 z-50">
			{/* Glassmorphism bar */}
			<div className="mx-auto max-w-6xl mt-3 px-3">
				<div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-xl px-4 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_rgba(0,0,0,0.4)]">

					{/* Logo */}
					<Link href="/" className="flex items-center gap-2 group shrink-0">
						<div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors duration-200">
							<KeyRound className="w-4 h-4 text-white" />
						</div>
						<span className="font-bold font-mono text-white text-base tracking-tight">
							KeyBox
							<span className="text-[10px] font-medium text-zinc-500 ml-1">v1.0.0</span>
						</span>
					</Link>

					{/* Nav links */}
					<nav className="hidden sm:flex items-center gap-1">
						<Link
							href="#how-it-works"
							className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-150"
						>
							How it works
						</Link>
						<Link
							href="/sdk-usage"
							className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-150"
						>
							SDK Docs
						</Link>
						<a
							href="https://github.com/huzfm/keybox"
							target="_blank"
							rel="noopener noreferrer"
							className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-150 flex items-center gap-1.5"
						>
							<Github className="w-3.5 h-3.5" />
							GitHub
						</a>
					</nav>

					{/* Right actions */}
					<div className="flex items-center gap-2 shrink-0">
						{/* Mobile GitHub */}
						<a
							href="https://github.com/huzfm/keybox"
							target="_blank"
							rel="noopener noreferrer"
							className="sm:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
						>
							<Github className="w-4 h-4" />
						</a>

						{isLoggedIn ? (
							<Link href="/dashboard">
								<button className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-black bg-white hover:bg-zinc-100 transition-colors duration-150 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
									Dashboard
								</button>
							</Link>
						) : (
							<>
								<Link href="/login">
									<button className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-150">
										Log in
									</button>
								</Link>
								<Link href="/signup">
									<button className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-black bg-white hover:bg-zinc-100 transition-colors duration-150 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
										Sign up
									</button>
								</Link>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	)
}
