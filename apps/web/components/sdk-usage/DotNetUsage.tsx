"use client"

import CodeBlock from "../ui/CodeBlock"

export default function DotNetUsage() {
        const dotnetCode = `using KeyboxSdk;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => "Hello World!");

await app.RunProtectedAsync(
    productName: "KeyBox Webapp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY"),
    );`

        return (
                <>
                        {/* Installation */}
                        <div>
                                <h2 className="text-2xl font-bold text-white mb-4">
                                        Installation
                                </h2>
                                <CodeBlock
                                        code="dotnet add package KeyboxSdk --version 1.0.0"
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
                                        code={dotnetCode}
                                        language="csharp"
                                        title="Program.cs"
                                />
                        </div>
                </>
        )
}
