"use client";

import { useState } from "react";
import NodeJsUsage from "./sdk-usage/NodeJsUsage";
import PythonUsage from "./sdk-usage/PythonUsage";
import DotNetUsage from "./sdk-usage/DotNetUsage";

type Language = "nodejs" | "python" | "dotnet";

export default function ApiUsagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("nodejs");

  return (
    <main className="relative overflow-hidden min-h-screen">
      {/* Grid Pattern Background */}
      <div
        className="
          pointer-events-none
          absolute inset-0
          z-0
          bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]
          bg-size-[35px_35px]
        "
      />

      {/* Content Container */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-mono">
              SDK Usage
            </h1>
            <p className="text-lg text-muted-foreground">
              Integrate KeyBox into your application with our SDK
            </p>
          </div>

          {/* Language Selector */}
          <div className="mx-auto mb-8 w-fit rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-sm">
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedLanguage("nodejs")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    selectedLanguage === "nodejs"
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }
                `}
              >
                Node.js
              </button>

              <button
                onClick={() => setSelectedLanguage("python")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    selectedLanguage === "python"
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }
                `}
              >
                Python
              </button>

              <button
                onClick={() => setSelectedLanguage("dotnet")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    selectedLanguage === "dotnet"
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }
                `}
              >
                .NET
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-8">
            {selectedLanguage === "nodejs" && <NodeJsUsage />}
            {selectedLanguage === "python" && <PythonUsage />}
            {selectedLanguage === "dotnet" && <DotNetUsage />}
          </div>
        </div>
      </section>
    </main>
  );
}
