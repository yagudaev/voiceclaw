import type { MouseEvent } from 'react'
import { Keyboard } from 'lucide-react'
import { attachmentDataUrl, type Attachment, type Message } from '../lib/db'
import { formatExactTimestamp } from '../lib/message-grouping'

interface MessageBubbleProps {
  message: Message
  attachments?: Attachment[]
  showLatency?: boolean
  showTimestamp?: boolean
  isLastInBurst?: boolean
  typed?: boolean
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, message: Message) => void
}

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const URL_IMAGE_REGEX = /(?:^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi

export function MessageBubble({
  message,
  attachments,
  showLatency,
  showTimestamp,
  isLastInBurst,
  typed,
  onContextMenu,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const parts = parseContent(message.content)
  const visibleAttachments = (attachments ?? []).filter(
    (a) => a.kind === 'image' && attachmentDataUrl(a) !== null,
  )

  const handleOpenAttachment = (attachment: Attachment) => {
    const url = attachmentDataUrl(attachment)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleContextMenu = onContextMenu
    ? (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        onContextMenu(e, message)
      }
    : undefined

  const burstSpacing = isLastInBurst === false ? 'mb-0.5' : 'mb-3'
  const exactTime = formatExactTimestamp(message.created_at)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${burstSpacing}`}>
      <div
        onContextMenu={handleContextMenu}
        title={exactTime}
        className={`
          max-w-[80%] min-w-0 rounded-md px-4 py-2.5 text-sm leading-relaxed break-words
          ${isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-foreground border border-border'
          }
        `}
      >
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i} className="whitespace-pre-wrap">
              {part.text}
            </span>
          ) : (
            <img
              key={i}
              src={part.url}
              alt={part.alt}
              className="rounded-md max-w-full mt-2 mb-1"
              loading="lazy"
            />
          ),
        )}
        {visibleAttachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleAttachments.map((a) => {
              const url = attachmentDataUrl(a)
              if (!url) return null
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleOpenAttachment(a)}
                  className="block rounded-md overflow-hidden border border-border/60 hover:border-primary transition-colors"
                  title={a.original_name ?? 'Attached image'}
                >
                  <img
                    src={url}
                    alt={a.original_name ?? 'Attached image'}
                    className="max-h-64 max-w-full object-contain block"
                    loading="lazy"
                  />
                </button>
              )
            })}
          </div>
        )}
        {showTimestamp && (
          <div className="text-[10px] mt-1.5 opacity-60">{exactTime}</div>
        )}
        {showLatency && message.stt_latency_ms != null && (
          <div className="text-[10px] mt-1.5 opacity-50">
            STT {Math.round(message.stt_latency_ms)}ms
            {message.llm_latency_ms != null && ` / LLM ${Math.round(message.llm_latency_ms)}ms`}
            {message.tts_latency_ms != null && ` / TTS ${Math.round(message.tts_latency_ms)}ms`}
          </div>
        )}
        {typed && isUser && (
          <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60" title="Sent as typed text">
            <Keyboard size={10} />
            <span>typed</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Helpers ---

type ContentPart = { type: 'text', text: string } | { type: 'image', url: string, alt: string }

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  let remaining = content

  // Extract markdown images
  const mdMatches = [...remaining.matchAll(MD_IMAGE_REGEX)]
  if (mdMatches.length > 0) {
    let lastIndex = 0
    for (const match of mdMatches) {
      const before = remaining.slice(lastIndex, match.index)
      if (before) parts.push({ type: 'text', text: before })
      parts.push({ type: 'image', url: match[2], alt: match[1] })
      lastIndex = match.index! + match[0].length
    }
    const after = remaining.slice(lastIndex)
    if (after) parts.push({ type: 'text', text: after })
    return parts
  }

  // Extract URL images
  const urlMatches = [...remaining.matchAll(URL_IMAGE_REGEX)]
  if (urlMatches.length > 0) {
    let lastIndex = 0
    for (const match of urlMatches) {
      const before = remaining.slice(lastIndex, match.index)
      if (before) parts.push({ type: 'text', text: before })
      parts.push({ type: 'image', url: match[1].trim(), alt: '' })
      lastIndex = match.index! + match[0].length
    }
    const after = remaining.slice(lastIndex)
    if (after) parts.push({ type: 'text', text: after })
    return parts
  }

  return [{ type: 'text', text: content }]
}
