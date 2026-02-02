"use client";

import { useState } from "react";
import CodeBlock from "./ui/CodeBlock";

type Language = "nodejs" | "python" | "dotnet";
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type PythonFramework = "fastapi" | "django";

export default function ApiUsagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("nodejs");
  const [packageManager, setPackageManager] = useState<PackageManager>("npm");
  const [pythonFramework, setPythonFramework] =
    useState<PythonFramework>("fastapi");

  const installCommands: Record<PackageManager, string> = {
    npm: "npm install keybox-sdk",
    pnpm: "pnpm add keybox-sdk",
    yarn: "yarn add keybox-sdk",
    bun: "bun add keybox-sdk",
  };

  const nodejsCode = `import express from "express";
import { protectNodeApp } from "keybox-sdk";
const app = express();

app.get("/", (_req, res) => {
  res.send("Your app is licensed and running.");
});

protectNodeApp({
  app,
  port: process.env.PORT,
  productName: "MyNodeApp",
  key: process.env.KEYBOX_LICENSE_KEY
  intervalSeconds: 86400, // once in 24hours
});`;

  const pythonFastApiCode = `import os
import sys
from pathlib import Path
from fastapi import FastAPI


from KeyBox_SDK import protect_fastapi_app

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Your app is licensed and running."}

protect_fastapi_app(
    app=app,
    product_name="MyPythonApp",
    key="696-BFED-B65E-41D6",
    interval_seconds=86400,  # once per 24h
)
`;

  const pythonDjangoCode = `# Django support coming soon!
# Currently only FastAPI is supported.
`;

  const dotnetCode = `using KeyboxSdk;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => "Hello World!");

await app.RunProtectedAsync(
    productName: "MyNodeApp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY") ?? throw new InvalidOperationException("KEYBOX_LICENSE_KEY is missing"),
    intervalSeconds: 5 // Check every 5 seconds
);`;

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
            {selectedLanguage === "nodejs" && (
              <>
                {/* Installation */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Installation
                  </h2>

                  {/* Package Manager Selector */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {(["npm", "pnpm", "yarn", "bun"] as PackageManager[]).map(
                      (pm) => (
                        <button
                          key={pm}
                          onClick={() => setPackageManager(pm)}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${
                              packageManager === pm
                                ? "bg-zinc-700 text-white"
                                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/60 border border-zinc-800/40"
                            }
                          `}
                        >
                          {pm}
                        </button>
                      ),
                    )}
                  </div>

                  <CodeBlock
                    code={installCommands[packageManager]}
                    language="bash"
                    title="Install KeyBox SDK"
                  />
                </div>

                {/* Usage */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Usage</h2>
                  <CodeBlock
                    code={nodejsCode}
                    language="javascript"
                    title="app.js or index.js"
                  />
                </div>
              </>
            )}

            {selectedLanguage === "python" && (
              <>
                {/* Framework Selector */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Framework
                  </h2>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {(["fastapi", "django"] as PythonFramework[]).map((fw) => (
                      <button
                        key={fw}
                        onClick={() => setPythonFramework(fw)}
                        className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                            ${
                              pythonFramework === fw
                                ? "bg-zinc-700 text-white"
                                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/60 border border-zinc-800/40"
                            }
                          `}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Installation */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Installation
                  </h2>
                  <CodeBlock
                    code="pip install keybox-sdk"
                    language="bash"
                    title="Install KeyBox SDK"
                  />
                </div>

                {/* Usage */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Usage</h2>
                  <CodeBlock
                    code={
                      pythonFramework === "fastapi"
                        ? pythonFastApiCode
                        : pythonDjangoCode
                    }
                    language="python"
                    title={
                      pythonFramework === "fastapi" ? "main.py" : "views.py"
                    }
                  />
                </div>
              </>
            )}

            {selectedLanguage === "dotnet" && (
              <>
                {/* Installation */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Installation
                  </h2>
                  <CodeBlock
                    code="dotnet add package KeyboxSdk"
                    language="bash"
                    title="Install KeyBox SDK"
                  />
                </div>

                {/* Usage */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Usage</h2>
                  <CodeBlock
                    code={dotnetCode}
                    language="csharp"
                    title="Program.cs"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
