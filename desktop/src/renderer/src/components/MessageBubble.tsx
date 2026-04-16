import type { Message } from '../lib/db'

interface MessageBubbleProps {
  message: Message
  showLatency?: boolean
}

const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const URL_IMAGE_REGEX = /(?:^|\s)(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi

export function MessageBubble({ message, showLatency }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const parts = parseContent(message.content)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
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
              className="rounded-lg max-w-full mt-2 mb-1"
              loading="lazy"
            />
          ),
        )}
        {showLatency && message.stt_latency_ms != null && (
          <div className="text-[10px] mt-1.5 opacity-50">
            STT {Math.round(message.stt_latency_ms)}ms
            {message.llm_latency_ms != null && ` / LLM ${Math.round(message.llm_latency_ms)}ms`}
            {message.tts_latency_ms != null && ` / TTS ${Math.round(message.tts_latency_ms)}ms`}
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
