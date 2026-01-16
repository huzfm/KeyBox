"use client";

import { useState } from "react";
import CodeBlock from "./ui/CodeBlock";

type Language = "nodejs" | "python";
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export default function ApiUsagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("nodejs");
  const [packageManager, setPackageManager] = useState<PackageManager>("npm");

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
  intervalSeconds: 10, // demo (10s). prod: 86400
});`;

  const pythonCode = `# Python SDK coming soon!
# Stay tuned for updates

from keybox import protect_app

# Protect your Python application
@protect_app(
    product_name="your-product-name",
    license_key="your-license-key",
    api_url="https://api-keybox.vercel.app"
)
def main():
    print("Your licensed application is running!")
    
if __name__ == "__main__":
    main()`;

  return (
    <main className="relative overflow-hidden min-h-screen">
      {/* GRID BACKGROUND */}
      <div
        className="
          pointer-events-none
          absolute inset-0
          z-0
          bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]
          bg-size-[35px_35px]
        "
      />

      {/* CONTENT */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* HEADER */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-mono">
              API Usage
            </h1>
            <p className="text-lg text-muted-foreground">
              Integrate KeyBox into your application with our SDK
            </p>
          </div>

          {/* LANGUAGE TOGGLE */}
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
  </div>
</div>

          {/* CONTENT BASED ON LANGUAGE */}
          <div className="space-y-8">
            {selectedLanguage === "nodejs" && (
              <>
                {/* INSTALLATION SECTION */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Installation
                  </h2>
                  
                  {/* PACKAGE MANAGER SELECTOR */}
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
                      )
                    )}
                  </div>

                  <CodeBlock
                    code={installCommands[packageManager]}
                    language="bash"
                    title="Install KeyBox SDK"
                  />
                </div>

                {/* USAGE SECTION */}
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
                {/* INSTALLATION SECTION */}
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

                {/* USAGE SECTION */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Usage</h2>
                  <CodeBlock
                    code={pythonCode}
                    language="python"
                    title="main.py"
                  />
                </div>

                {/* COMING SOON NOTICE */}
                {/* <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-yellow-500 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-zinc-300">
                    Python SDK is currently under development. Stay tuned for
                    updates!
                  </p>
                </div> */}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
