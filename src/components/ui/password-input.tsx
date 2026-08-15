"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps extends React.ComponentProps<typeof Input> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={`pr-10 ${className || ""}`}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            setShowPassword(!showPassword);
          }}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
