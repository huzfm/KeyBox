import Link from "next/link";
import { Lock, Github, Twitter } from "lucide-react";
import { KeyRound } from "lucide-react";

export default function HomeNavbar() {
  return (
    <header className="sticky top-0 z-50 ">
      <div className="max-w-7xl mx-auto px-60 py-10 flex items-center justify-between">
        {/* LEFT: Logo + Name */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-white " />
          </div>
          <span className="text-2xl  text-white font-bold">KeyBox</span>
        </div>

        {/* RIGHT: Socials + Login */}
        <div className="flex items-center gap-10">
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
            className="px-4 py-2 text-sm font-medium text-white bg-black border  rounded-lg transition"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
