import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`
          w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
          text-foreground appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
    )
  },
)

Select.displayName = 'Select'
