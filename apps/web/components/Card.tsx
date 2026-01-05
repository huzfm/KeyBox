"use client";

import { Key, Shield, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Key,
    title: "License Generation",
    desc: "Create secure, unique license keys",
    details:
      "Generate cryptographically secure license keys with customizable expiry dates and usage limits.",
    benefits: ["Unique Key Generation", "Expiry Control", "Usage Tracking"],
    color: "from-zinc-900/80 to-black/70",
    accentColor: "bg-zinc-800/30",
    borderColor: "border-zinc-800/40",
  },
  {
    icon: Shield,
    title: "Security First",
    desc: "Enterprise-grade encryption",
    details:
      "Bank-level security with AES-256 encryption and secure key storage.",
    benefits: ["AES-256 Encryption", "Secure Storage", "Compliance Ready"],
    color: "from-zinc-900/80 to-black/70",
    accentColor: "bg-zinc-800/30",
    borderColor: "border-zinc-800/40",
  },
  {
    icon: Zap,
    title: "Auto Expiry",
    desc: "Automated lifecycle management",
    details:
      "Set automatic expiration policies and renewal reminders effortlessly.",
    benefits: ["Auto Expiration", "Renewal Alerts", "Bulk Management"],
    color: "from-zinc-900/80 to-black/70",
    accentColor: "bg-zinc-800/30",
    borderColor: "border-zinc-800/40",
  },
];

export default function Home() {
  return (
    <main>
      {/* HERO */}

      {/* INFINITE SCROLL FEATURES */}
      <section className="relative py-16 overflow-hidden">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Powerful Features
          </h2>
          <p className="text-muted-foreground mt-4">
            Everything you need to manage licenses efficiently
          </p>
        </div>

        {/* SCROLLER */}
        <div className="relative w-full overflow-hidden">
          <div className="flex w-max animate-scroll hover:paused">
            {[...features, ...features].map(
              (
                {
                  icon: Icon,
                  title,
                  desc,
                  details,
                  benefits,
                  color,
                  accentColor,
                  borderColor,
                },
                index
              ) => (
                <div
                  key={`${title}-${index}`}
                  className="
                    mx-4 shrink-0 w-80 p-8 rounded-2xl
                    backdrop-blur-xl
                    transition-all duration-500 ease-out
                    hover:shadow-2xl
                    group relative overflow-hidden
                  "
                >
                  {/* Background */}
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${color} border ${borderColor} rounded-2xl`}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    <div
                      className={`w-16 h-16 ${accentColor} rounded-xl flex items-center justify-center mb-6`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {title}
                    </h3>

                    <p className="text-sm text-slate-200 mb-4 font-medium">
                      {desc}
                    </p>

                    <div className="w-12 h-1 bg-white/20 rounded-full mb-4" />

                    <p className="text-sm text-slate-300 mb-6">{details}</p>

                    <div className="space-y-3 mb-6">
                      {benefits.map((b) => (
                        <div key={b} className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-white/60 mt-1.5" />
                          <span className="text-sm text-slate-200">{b}</span>
                        </div>
                      ))}
                    </div>

                    <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition border border-white/20 hover:border-white/40">
                      Learn More
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Edge fades */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </section>
    </main>
  );
}
