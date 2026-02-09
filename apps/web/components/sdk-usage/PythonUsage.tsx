"use client"

import { useState } from "react"
import CodeBlock from "../ui/CodeBlock"

type PythonFramework = "fastapi" | "django"

export default function PythonUsage() {
        const [pythonFramework, setPythonFramework] =
                useState<PythonFramework>("fastapi")

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
    product_name="KeyBox Webapp",
    key=os.getenv("KEYBOX_LICENSE_KEY"),
`

        const pythonDjangoCode = `# Django support coming soon!
# Currently only FastAPI is supported.
`

        return (
                <>
                        {/* Framework Selector */}
                        <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-4">
                                        Framework
                                </h2>
                                <div className="flex gap-2 mb-4 flex-wrap">
                                        {(
                                                [
                                                        "fastapi",
                                                        "django",
                                                ] as PythonFramework[]
                                        ).map((fw) => (
                                                <button
                                                        key={fw}
                                                        onClick={() =>
                                                                setPythonFramework(
                                                                        fw,
                                                                )
                                                        }
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
                                <h2 className="text-2xl font-bold text-white mb-4">
                                        Usage
                                </h2>
                                <CodeBlock
                                        code={
                                                pythonFramework === "fastapi"
                                                        ? pythonFastApiCode
                                                        : pythonDjangoCode
                                        }
                                        language="python"
                                        title={
                                                pythonFramework === "fastapi"
                                                        ? "main.py"
                                                        : "views.py"
                                        }
                                />
                        </div>
                </>
        )
}
