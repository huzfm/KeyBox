import {
  ArrowRight,
  Shield,
  Key,
  BarChart3,
  Zap,
  Lock,
  CheckCircle,
  Cpu,
} from "lucide-react";
import Link from "next/link";

export default function HomeSections() {
  return (
    <>
      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-30 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-mono text-white mb-4 sm:mb-6">
          Secure license management
          <span className="block text-primary">for your Software</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10">
          Generate, validate, and manage software licenses with ease
        </p>

        <div className="flex justify-center">
          <Link href="/signup">
            <button
              className="
                px-5 py-2.5 sm:px-6 sm:py-3 
                bg-slate-100 font-semibold text-black rounded-xl
                shadow-[0_0_35px_rgba(255,255,255,0.35)]
                hover:shadow-[0_0_55px_rgba(255,255,255,0.55)]
                transition-shadow duration-300
              "
            >
              Get Started
            </button>
          </Link>
        </div>
      </section>
    </>
  );
}
