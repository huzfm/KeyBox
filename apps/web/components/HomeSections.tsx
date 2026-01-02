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
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
          Secure license management
          <span className="block text-primary">for your Software</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Generate, validate, and manage software licenses with ease
        </p>

        <div className="flex justify-center gap-4">
          <Link href="/signup">
            <button
              className="
        px-6 py-3 bg-slate-100 font-semibold text-black rounded-xl
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

      {/* FEATURES */}
      <section id="features" className="py-20 ">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-14">
            Powerful Features
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Key,
                title: "License Generation",
                desc: "Secure unique keys with expiry.",
              },
              {
                icon: BarChart3,
                title: "Real-Time Validation",
                desc: "Instant REST validation.",
              },
              {
                icon: Shield,
                title: "Security First",
                desc: "Enterprise-grade encryption.",
              },
              {
                icon: Zap,
                title: "Auto Expiry",
                desc: "Lifecycle automation.",
              },
              { icon: Cpu, title: "Analytics", desc: "Track activations." },
              {
                icon: Lock,
                title: "Access Control",
                desc: "Granular permissions.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-md border border-border bg-card shadow-sm"
              >
                <div className="w-10 h-10 bg-primary/15 rounded-md flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
    </>
  );
}
