import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full rounded-md border border-input bg-background px-3 py-2 text-sm
          text-foreground placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
