import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: CardProps) {
  return <div className={`p-4 pb-2 ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`p-4 pt-2 ${className}`} {...props} />
}
