import * as React from "react"
import { cn } from "../../lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

const Tooltip = ({ children }: { children: React.ReactNode }) => <div className="group relative inline-block">{children}</div>

const TooltipTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => (
  <button ref={ref} className={cn("", className)} {...props} />
))
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50", className)} {...props} />
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
