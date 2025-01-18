import * as React from "react"
import { Input, InputProps } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const InputPassword = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
      <div className="relative w-full">
        <Input
          className={cn(className, "pr-10", "peer")}
          error={error}
          ref={ref}
          {...props}
          type={isVisible ? "text" : "password"}
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer peer-autofill:text-black"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </div>
        
      </div>
    )
  }
)
InputPassword.displayName = "InputPassword"

export { InputPassword }
