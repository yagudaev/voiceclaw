import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Paperclip, Send } from 'lucide-react'
import { Button } from './ui/Button'
import {
  COMPOSER_LIMITS,
  isSubmittable,
  normalizeComposerText,
} from '../lib/composer'

export interface ChatComposerProps {
  onSubmit: (text: string) => void
  onAttach?: () => void
  // When set, the attach button stays visible but is disabled and the
  // string becomes its tooltip (used to gate image attachments on
  // models that don't accept visual input — see ChatPage).
  attachDisabledReason?: string
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({
  onSubmit,
  onAttach,
  attachDisabledReason,
  disabled,
  placeholder,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = useCallback(() => {
    const cleaned = normalizeComposerText(value)
    if (!cleaned) return
    onSubmit(cleaned)
    setValue('')
  }, [value, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.nativeEvent.isComposing) return
        e.preventDefault()
        submit()
      }
    },
    [submit],
  )

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    autosize(el)
  }, [value])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    autosize(el)
  }, [])

  const canSubmit = !disabled && isSubmittable(value)

  return (
    <div className="px-4 py-3 border-t border-border bg-background/80 backdrop-blur">
      <div className="flex items-end gap-2">
        {onAttach && (
          // Wrap in a span so the tooltip still shows when the button
          // is disabled (most browsers suppress title on disabled
          // controls).
          <span
            title={
              attachDisabledReason
                ? attachDisabledReason
                : 'Attach an image (PNG, JPG, WEBP, ≤10MB)'
            }
            className="inline-flex"
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={onAttach}
              disabled={disabled || Boolean(attachDisabledReason)}
              aria-label="Attach an image"
              aria-disabled={Boolean(attachDisabledReason) || undefined}
            >
              <Paperclip size={18} />
            </Button>
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder ?? 'Type a message — Enter sends, Shift+Enter for newline'}
          aria-label="Type a message"
          className="
            flex-1 resize-none rounded-md border border-input bg-background px-3 py-2.5
            text-sm text-foreground placeholder:text-muted-foreground leading-5
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            whitespace-pre-wrap
          "
          style={{ minHeight: minHeightPx(), maxHeight: maxHeightPx() }}
        />
        <Button
          variant="default"
          size="icon"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send message"
          title="Send (Enter)"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minHeightPx() {
  return COMPOSER_LIMITS.minRows * COMPOSER_LIMITS.lineHeightPx + COMPOSER_LIMITS.verticalPaddingPx
}

function maxHeightPx() {
  return COMPOSER_LIMITS.maxRows * COMPOSER_LIMITS.lineHeightPx + COMPOSER_LIMITS.verticalPaddingPx
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  const next = Math.min(el.scrollHeight, maxHeightPx())
  el.style.height = `${Math.max(minHeightPx(), next)}px`
}
