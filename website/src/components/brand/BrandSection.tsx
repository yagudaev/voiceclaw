import type { ReactNode } from "react"

export function BrandSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={`border-t border-[color-mix(in_oklch,currentColor_8%,transparent)] px-8 py-16 md:px-16 ${className}`}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 max-w-2xl">
          {eyebrow && (
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-50">
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-sm leading-relaxed opacity-60 sm:text-base">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </section>
  )
}
