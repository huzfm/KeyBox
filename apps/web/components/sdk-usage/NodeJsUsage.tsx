"use client"

import { useState } from "react"
import CodeBlock from "../ui/CodeBlock"

type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export default function NodeJsUsage() {
        const [packageManager, setPackageManager] =
                useState<PackageManager>("npm")

        const installCommands: Record<PackageManager, string> = {
                npm: "npm install keybox-sdk",
                pnpm: "pnpm add keybox-sdk",
                yarn: "yarn add keybox-sdk",
                bun: "bun add keybox-sdk",
        }

        const nodejsCode = `import express from "express";
import { protectNodeApp } from "keybox-sdk";
const app = express();

app.get("/", (_req, res) => {
  res.send("Your app is licensed and running.");
});

protectNodeApp({
  app,
  port: process.env.PORT,
  productName: "KeyBox Webapp",
  key: process.env.KEYBOX_LICENSE_KEY
});`

        return (
                <>
                        {/* Installation */}
                        <div>
                                <h2 className="text-2xl font-bold text-white mb-4">
                                        Installation
                                </h2>

                                {/* Package Manager Selector */}
                                <div className="flex gap-2 mb-4 flex-wrap">
                                        {(
                                                [
                                                        "npm",
                                                        "pnpm",
                                                        "yarn",
                                                        "bun",
                                                ] as PackageManager[]
                                        ).map((pm) => (
                                                <button
                                                        key={pm}
                                                        onClick={() =>
                                                                setPackageManager(
                                                                        pm,
                                                                )
                                                        }
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
                                        ))}
                                </div>

                                <CodeBlock
                                        code={installCommands[packageManager]}
                                        language="bash"
                                        title="Install KeyBox SDK"
                                />
                        </div>

                        {/* Usage */}
                        <div>
                                <h2 className="text-2xl font-bold text-white mb-4">
                                        Usage
                                </h2>
                                <CodeBlock
                                        code={nodejsCode}
                                        language="javascript"
                                        title="app.js or index.js"
                                />
                        </div>
                </>
        )
}
