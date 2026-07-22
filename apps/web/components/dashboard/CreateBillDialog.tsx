"use client"

import { useState } from "react"
import {
     Dialog,
     DialogContent,
     DialogDescription,
     DialogFooter,
     DialogHeader,
     DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Send, FileText } from "lucide-react"

interface BillItem {
     id: string
     description: string
     amount: number
}

interface License {
     _id: string
     services?: string | string[]
}

interface Project {
     _id: string
     name: string
     licenses?: License[]
}

interface Client {
     _id: string
     name: string
     email?: string
     projects?: Project[]
}

interface CreateBillDialogProps {
     client: Client | null
     isOpen: boolean
     onOpenChange: (open: boolean) => void
}

export default function CreateBillDialog({
     client,
     isOpen,
     onOpenChange,
}: CreateBillDialogProps) {
     const [items, setItems] = useState<BillItem[]>([
          { id: "1", description: "Service Charge", amount: 0 },
     ])
     const [selectedProjectId, setSelectedProjectId] = useState<string>("")
     const [step, setStep] = useState<"create" | "preview">("create")
     const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null)

     if (!client) return null

     const handleProjectChange = (projectId: string) => {
          setSelectedProjectId(projectId)

          const project = client.projects?.find((p) => p._id === projectId)
          if (project && project.licenses) {
               const serviceSet = new Set<string>()

               project.licenses.forEach((license) => {
                    if (license.services) {
                         const services = Array.isArray(license.services)
                              ? license.services
                              : license.services.split(",")

                         services.forEach((s) => {
                              const trimmed = s.trim()
                              if (trimmed) serviceSet.add(trimmed)
                         })
                    }
               })

               if (serviceSet.size > 0) {
                    const newItems = Array.from(serviceSet).map((service) => ({
                         id: Math.random().toString(),
                         description: service,
                         amount: 0,
                    }))
                    setItems(newItems)
               } else {
                    setItems([
                         {
                              id: Math.random().toString(),
                              description: "Service Charge",
                              amount: 0,
                         },
                    ])
               }
          }
     }

     const addItem = () => {
          setItems([
               ...items,
               {
                    id: Math.random().toString(),
                    description: "",
                    amount: 0,
               },
          ])
     }

     const removeItem = (id: string) => {
          setItems(items.filter((item) => item.id !== id))
     }

     const updateItem = (
          id: string,
          field: keyof BillItem,
          value: string | number,
     ) => {
          setItems(
               items.map((item) =>
                    item.id === id ? { ...item, [field]: value } : item,
               ),
          )
     }

     const totalAmount = items.reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0,
     )

     const handleCreate = () => {
          if (!selectedProjectId) return
          // Generated here rather than in render: Math.random() during render is
          // impure and would produce a new invoice number on every re-render.
          setInvoiceNumber(Math.floor(Math.random() * 10000))
          setStep("preview")
     }

     const handleSendEmail = () => {
          const project = client.projects?.find(
               (p) => p._id === selectedProjectId,
          )
          console.log("Sending email to:", client.email)
          console.table([
               {
                    clientName: client.name,
                    projectName: project?.name,
                    total: totalAmount,
               },
          ])

          onOpenChange(false)
          setTimeout(() => {
               setStep("create")
               setItems([
                    {
                         id: "1",
                         description: "Service Charge",
                         amount: 0,
                    },
               ])
               setSelectedProjectId("")
          }, 300)
     }

     const selectedProject = client.projects?.find(
          (p) => p._id === selectedProjectId,
     )

     return (
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
               <DialogContent className="sm:max-w-[500px] bg-zinc-950 border border-zinc-800 text-white">
                    <DialogHeader>
                         <DialogTitle className="text-xl">
                              {step === "create"
                                   ? "Create New Bill"
                                   : "Bill Created Successfully"}
                         </DialogTitle>
                         <DialogDescription className="text-zinc-400">
                              {step === "create"
                                   ? `Add billing details for ${client.name}`
                                   : `Review and send the bill to ${client.name}`}
                         </DialogDescription>
                    </DialogHeader>

                    {step === "create" ? (
                         <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                   <span className="text-xs text-zinc-400">
                                        Project
                                   </span>
                                   <Select
                                        value={selectedProjectId}
                                        onValueChange={handleProjectChange}
                                   >
                                        <SelectTrigger className="bg-zinc-900/70 border-zinc-800 text-white">
                                             <SelectValue placeholder="Select a project" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900/70 border-zinc-800 text-white">
                                             {client.projects &&
                                             client.projects.length > 0 ? (
                                                  client.projects.map(
                                                       (project) => (
                                                            <SelectItem
                                                                 key={
                                                                      project._id
                                                                 }
                                                                 value={
                                                                      project._id
                                                                 }
                                                                 className="focus:bg-zinc-700 focus:text-white"
                                                            >
                                                                 {project.name}
                                                            </SelectItem>
                                                       ),
                                                  )
                                             ) : (
                                                  <div className="p-2 text-sm text-zinc-400">
                                                       No projects found
                                                  </div>
                                             )}
                                        </SelectContent>
                                   </Select>
                              </div>

                              <div className="space-y-3">
                                   {items.map((item, index) => (
                                        <div
                                             key={item.id}
                                             className="flex gap-2 items-start"
                                        >
                                             <div className="grid gap-1.5 flex-1">
                                                  {index === 0 && (
                                                       <span className="text-xs text-zinc-400">
                                                            Description
                                                       </span>
                                                  )}
                                                  <Input
                                                       placeholder="Service description"
                                                       value={item.description}
                                                       onChange={(e) =>
                                                            updateItem(
                                                                 item.id,
                                                                 "description",
                                                                 e.target.value,
                                                            )
                                                       }
                                                       className="bg-zinc-900/70 border-zinc-800 text-white"
                                                  />
                                             </div>
                                             <div className="grid gap-1.5 w-24">
                                                  {index === 0 && (
                                                       <span className="text-xs text-zinc-400">
                                                            Amount
                                                       </span>
                                                  )}
                                                  <Input
                                                       type="number"
                                                       placeholder="0.00"
                                                       min="0"
                                                       step="0.01"
                                                       value={item.amount || ""}
                                                       onChange={(e) =>
                                                            updateItem(
                                                                 item.id,
                                                                 "amount",
                                                                 e.target
                                                                      .value ===
                                                                      ""
                                                                      ? 0
                                                                      : parseFloat(
                                                                             e
                                                                                  .target
                                                                                  .value,
                                                                        ),
                                                            )
                                                       }
                                                       className="bg-zinc-900/70 border-zinc-800 text-white"
                                                  />
                                             </div>
                                             <div
                                                  className={
                                                       index === 0 ? "pt-5" : ""
                                                  }
                                             >
                                                  <Button
                                                       variant="ghost"
                                                       size="icon"
                                                       onClick={() =>
                                                            removeItem(item.id)
                                                       }
                                                       className="text-zinc-400 "
                                                       disabled={
                                                            items.length === 1
                                                       }
                                                  >
                                                       <Trash2 className="h-4 w-4" />
                                                  </Button>
                                             </div>
                                        </div>
                                   ))}
                              </div>

                              <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={addItem}
                                   className="w-full border-2 border-black text-black bg-zinc-100 font-mono text-sm"
                              >
                                   <Plus className="h-4 w-4 mr-2" /> Add Item
                              </Button>

                              <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                                   <span className="font-semibold text-3xl">
                                        Total
                                   </span>
                                   <span className="text-xl font-bold text-white border-1 px-2 py-1 rounded-md border-zinc-200">
                                        ₹ {totalAmount.toFixed(2)}
                                   </span>
                              </div>
                         </div>
                    ) : (
                         <div className="py-6 space-y-6">
                              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3 border border-zinc-700">
                                   <div className="flex items-center gap-3 pb-3 border-b border-zinc-700/50">
                                        <div className="h-10 w-10 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                                             <FileText className="h-5 w-5 text-violet-300" />
                                        </div>
                                        <div>
                                             <p className="font-medium text-white">
                                                  Invoice #{invoiceNumber}
                                             </p>
                                             <p className="text-xs text-zinc-400">
                                                  {new Date().toLocaleDateString()}
                                             </p>
                                        </div>
                                        <div className="ml-auto text-right">
                                             <p className="font-bold text-white">
                                                  ₹{totalAmount.toFixed(2)}
                                             </p>
                                             <p className="text-xs text-zinc-400">
                                                  {items.length} items
                                             </p>
                                        </div>
                                   </div>
                                   <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                                             Billed To
                                        </p>
                                        <div className="flex justify-between items-start">
                                             <div>
                                                  <p className="text-sm font-medium">
                                                       {client.name}
                                                  </p>
                                                  <p className="text-sm text-zinc-400">
                                                       {client.email ||
                                                            "No email provided"}
                                                  </p>
                                             </div>
                                             {selectedProject && (
                                                  <div className="text-right">
                                                       <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                                                            Project
                                                       </p>
                                                       <p className="text-sm font-medium text-violet-300">
                                                            {
                                                                 selectedProject.name
                                                            }
                                                       </p>
                                                  </div>
                                             )}
                                        </div>
                                   </div>
                              </div>
                         </div>
                    )}

                    <DialogFooter>
                         {step === "create" ? (
                              <Button
                                   onClick={handleCreate}
                                   disabled={!selectedProjectId}
                                   className="w-full bg-white text-black hover:bg-zinc-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                   Create Bill
                              </Button>
                         ) : (
                              <Button
                                   onClick={handleSendEmail}
                                   className="w-full bg-white text-black hover:bg-zinc-200 font-medium"
                              >
                                   <Send className="h-4 w-4 mr-2" />
                                   Send to {client.email || "Client"}
                              </Button>
                         )}
                    </DialogFooter>
               </DialogContent>
          </Dialog>
     )
}
