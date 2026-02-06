"use client";

import { Check, Copy } from "lucide-react";
import { useState, useMemo } from "react";

interface CodeBlockProps {
       code: string;
       language: string;
       title?: string;
}

export default function CodeBlock({ code, language, title }: CodeBlockProps) {
       const [copied, setCopied] = useState(false);

       const handleCopy = async () => {
              try {
                     await navigator.clipboard.writeText(code);
                     setCopied(true);
                     setTimeout(() => setCopied(false), 2000);
              } catch (err) {
                     console.error("Failed to copy:", err);
              }
       };

       const highlightCode = useMemo(() => {
              if (language === "bash") {
                     return code;
              }

              let highlighted = code
                     .replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");

              highlighted = highlighted.replace(
                     /(&quot;|&#039;|`)([^&quot;&#039;`]*?)(\1)/g,
                     '<span class="text-green-400">$1$2$3</span>',
              );

              highlighted = highlighted.replace(
                     /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
                     '<span class="text-zinc-500 italic">$1</span>',
              );

              const keywords = [
                     "import",
                     "from",
                     "export",
                     "const",
                     "let",
                     "var",
                     "function",
                     "async",
                     "await",
                     "return",
                     "if",
                     "else",
                     "for",
                     "while",
                     "class",
                     "extends",
                     "new",
                     "try",
                     "catch",
                     "throw",
                     "default",
                     "case",
                     "switch",
                     "break",
                     "continue",
                     "typeof",
                     "instanceof",
                     "this",
                     "super",
                     "static",
                     "get",
                     "set",
              ];

              keywords.forEach((keyword) => {
                     const regex = new RegExp(
                            `(?<!<[^>]*)\\b(${keyword})\\b(?![^<]*<\\/span>)`,
                            "g",
                     );
                     highlighted = highlighted.replace(
                            regex,
                            `<span class="text-pink-400">$1</span>`,
                     );
              });

              highlighted = highlighted.replace(
                     /(?<!<[^>]*)\b(\d+)\b(?![^<]*<\/span>)/g,
                     '<span class="text-blue-400">$1</span>',
              );

              highlighted = highlighted.replace(
                     /(?<!<[^>]*)\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((?![^<]*<\/span>)/g,
                     '<span class="text-yellow-300">$1</span>(',
              );

              highlighted = highlighted.replace(
                     /(?<!<[^>]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)(?![^<]*<\/span>)/g,
                     '.<span class="text-cyan-300">$1</span>',
              );

              return highlighted;
       }, [code, language]);

       const codeLines = (language === "bash" ? code : highlightCode).split(
              "\n",
       );
       const isTerminal = language === "bash";

       return (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-800/50 shadow-xl">
                     {}
                     <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2">
                                   {title && (
                                          <span className="text-xs text-zinc-400 font-mono">
                                                 {title}
                                          </span>
                                   )}
                                   {!title && (
                                          <span className="text-xs text-zinc-500 font-mono">
                                                 {language}
                                          </span>
                                   )}
                            </div>

                            {}
                            <button
                                   onClick={handleCopy}
                                   className="
            flex items-center gap-1.5
            px-2.5 py-1.5 
            bg-zinc-800/60 hover:bg-zinc-700/80
            rounded-md 
            transition-all duration-200
            border border-zinc-700/40 hover:border-zinc-600/60
            opacity-60 group-hover:opacity-100
          "
                                   aria-label="Copy code"
                            >
                                   {copied ? (
                                          <>
                                                 <Check className="w-3.5 h-3.5 text-green-400" />
                                                 <span className="text-xs text-green-400 font-medium">
                                                        Copied
                                                 </span>
                                          </>
                                   ) : (
                                          <>
                                                 <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                                 <span className="text-xs text-zinc-400 font-medium">
                                                        Copy
                                                 </span>
                                          </>
                                   )}
                            </button>
                     </div>

                     {}
                     <div className="relative bg-[#0a0a0a]">
                            <pre className="p-0 overflow-x-auto scrollbar-hide">
                                   <code className="block font-mono text-[13px] leading-[1.7]">
                                          {codeLines.map((line, index) => (
                                                 <div
                                                        key={index}
                                                        className="flex hover:bg-zinc-900/40 transition-colors group/line"
                                                 >
                                                        {!isTerminal && (
                                                               <span className="select-none text-zinc-700 text-right pr-4 pl-4 py-1 min-w-[3.5rem] inline-block border-r border-zinc-800/40 bg-zinc-950/50">
                                                                      {index +
                                                                             1}
                                                               </span>
                                                        )}
                                                        {isTerminal && (
                                                               <span className="select-none text-emerald-400 pl-4 pr-3 py-1 font-semibold">
                                                                      $
                                                               </span>
                                                        )}
                                                        <span
                                                               className={`flex-1 px-4 py-1 ${isTerminal ? "text-zinc-200" : "text-zinc-300"}`}
                                                               dangerouslySetInnerHTML={{
                                                                      __html:
                                                                             line ||
                                                                             "&nbsp;",
                                                               }}
                                                        />
                                                 </div>
                                          ))}
                                   </code>
                            </pre>
                     </div>
              </div>
       );
}
