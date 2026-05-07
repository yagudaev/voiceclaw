import { describe, expect, it } from "vitest"
import { OpenAIAdapter } from "../../src/adapters/openai.js"

type SessionConfig = Record<string, unknown>

describe("OpenAIAdapter session.update wire format (Realtime GA)", () => {
  it("emits the GA-shape session config: type=realtime, nested audio, output_modalities", () => {
    const adapter = new OpenAIAdapter()
    const session = buildSession(adapter, {
      provider: "openai",
      voice: "marin",
      model: "gpt-realtime-2",
    })

    expect(session.type).toBe("realtime")
    expect(session.model).toBe("gpt-realtime-2")
    expect(session.output_modalities).toEqual(["audio"])

    const audio = session.audio as {
      input?: Record<string, unknown>
      output?: Record<string, unknown>
    }
    expect(audio.input?.format).toEqual({ type: "audio/pcm", rate: 24000 })
    expect(audio.input?.transcription).toEqual({ model: "gpt-4o-mini-transcribe" })
    expect(audio.input?.turn_detection).toMatchObject({ type: "server_vad" })
    expect(audio.output?.format).toEqual({ type: "audio/pcm", rate: 24000 })
    expect(audio.output?.voice).toBe("marin")

    // GA dropped these top-level beta fields
    expect(session.modalities).toBeUndefined()
    expect(session.input_audio_format).toBeUndefined()
    expect(session.output_audio_format).toBeUndefined()
    expect(session.input_audio_transcription).toBeUndefined()
    expect(session.voice).toBeUndefined()
    expect(session.turn_detection).toBeUndefined()
    expect(session.temperature).toBeUndefined()
  })

  it("falls back to the adapter default model when config.model is missing", () => {
    const adapter = new OpenAIAdapter()
    const session = buildSession(adapter, {
      provider: "openai",
      voice: "marin",
    })

    expect(session.model).toBe("gpt-realtime-2")
  })

  it("does not send the OpenAI-Beta header (GA dropped beta gating)", () => {
    const adapter = new OpenAIAdapter()
    const headers = (adapter as unknown as { authHeaders: Record<string, string> }).authHeaders
    expect(headers).toEqual({})
  })
})

describe("OpenAIAdapter upstream event renames (GA)", () => {
  it("forwards GA audio deltas (response.output_audio.delta) as audio.delta to the client", () => {
    const adapter = new OpenAIAdapter()
    const out = captureClientEvents(adapter)
    emit(adapter, { type: "response.output_audio.delta", delta: "AAA=" })
    expect(out).toEqual([{ type: "audio.delta", data: "AAA=" }])
  })

  it("forwards GA assistant transcript deltas (response.output_audio_transcript.delta)", () => {
    const adapter = new OpenAIAdapter()
    const out = captureClientEvents(adapter)
    emit(adapter, { type: "response.output_audio_transcript.delta", delta: "hello" })
    expect(out).toEqual([{ type: "transcript.delta", text: "hello", role: "assistant" }])
  })

  it("forwards GA text-only output (response.output_text.delta) as transcript deltas", () => {
    const adapter = new OpenAIAdapter()
    const out = captureClientEvents(adapter)
    emit(adapter, { type: "response.output_text.delta", delta: "hi" })
    emit(adapter, { type: "response.output_text.done", text: "hi there" })
    expect(out).toEqual([
      { type: "transcript.delta", text: "hi", role: "assistant" },
      { type: "transcript.done", text: "hi there", role: "assistant" },
    ])
  })

  it("sendFrame injects an input_image conversation item for openai (GA)", () => {
    const adapter = new OpenAIAdapter()
    const captured = captureUpstream(adapter)
    adapter.sendFrame("AAA=", "image/png")
    expect(captured).toEqual([
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_image", image_url: "data:image/png;base64,AAA=" }],
        },
      },
    ])
  })

  it("sendFrame is a no-op when sessionFormat is xai (legacy beta dialect)", () => {
    const adapter = new OpenAIAdapter({ sessionFormat: "xai" })
    const captured = captureUpstream(adapter)
    adapter.sendFrame("AAA=", "image/png")
    expect(captured).toEqual([])
  })
})

function buildSession(adapter: OpenAIAdapter, config: Record<string, unknown>): SessionConfig {
  const internals = adapter as unknown as {
    buildSessionConfig: (
      cfg: Record<string, unknown>,
      instructions: string,
      tools: unknown[],
    ) => SessionConfig
  }
  return internals.buildSessionConfig(config, "test-instructions", [])
}

function captureClientEvents(adapter: OpenAIAdapter): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const internals = adapter as unknown as { sendToClient: (e: Record<string, unknown>) => void }
  internals.sendToClient = (e) => {
    out.push(e)
  }
  return out
}

function captureUpstream(adapter: OpenAIAdapter): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const internals = adapter as unknown as { sendUpstream: (e: Record<string, unknown>) => boolean }
  internals.sendUpstream = (e) => {
    out.push(e)
    return true
  }
  return out
}

function emit(adapter: OpenAIAdapter, event: Record<string, unknown>) {
  const internals = adapter as unknown as {
    handleUpstreamEvent: (e: Record<string, unknown>) => void
  }
  internals.handleUpstreamEvent(event)
}
