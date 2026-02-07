import * as React from "react"
import { cn } from "../../lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, onCheckedChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked);
  }
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" ref={ref} onChange={handleChange} {...props} />
      <div className={cn("w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary", className)}></div>
    </label>
  )
})
Switch.displayName = "Switch"

export { Switch }
