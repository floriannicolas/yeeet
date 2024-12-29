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
          className={cn(className, "pr-10")}
          error={error}
          ref={ref}
          {...props}
          type={isVisible ? "text" : "password"}
        />
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-black"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? <EyeOff /> : <Eye />}
        </div>
        
      </div>
    )
  }
)
InputPassword.displayName = "InpInputPasswordut"

export { InputPassword }
