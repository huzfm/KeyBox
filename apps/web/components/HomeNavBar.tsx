import Link from "next/link";
import { Github, Twitter, KeyRound } from "lucide-react";

export default function HomeNavbar() {
  return (
    <header className="sticky top-0 z-50">
      <div
        className="
          max-w-7xl mx-auto
          flex items-center justify-between
          px-4 py-3         
          sm:px-8 sm:py-4
          lg:px-60 lg:py-6    
        "
      >
        {/* LEFT: Logo + Name */}
        <div className="flex items-center gap-2 ring-1 ring-white/20 bg-black rounded-2xl px-2 py-2 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300">
          <div className="w-8 h-8 flex items-center justify-center shrink-0 ">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <span className="text-lg sm:text-xl lg:text-2xl text-white font-bold truncate font-mono ">
            KeyBox
          </span>
        </div>

        {/* RIGHT: Socials + Login */}
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white transition"
          >
            <Github className="w-5 h-5" />
          </a>

          <a
            href="https://twitter.com/your-handle"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white transition"
          >
            <Twitter className="w-5 h-5" />
          </a>

          <Link
            href="/login"
            className="
              px-3 py-1.5 sm:px-4 sm:py-2
              text-xs sm:text-sm
              font-medium text-white
              bg-black border rounded-lg transition
            "
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
