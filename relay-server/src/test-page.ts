// Serves a self-contained HTML test page for the relay pipeline
// No build step — just inline HTML/JS with Web Audio API

export function getTestPageHTML(host: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoiceClaw Relay Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; max-width: 640px; margin: 0 auto }
    h1 { font-size: 20px; margin-bottom: 4px }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 24px }
    .section { margin-bottom: 20px }
    label { display: block; font-size: 13px; color: #999; margin-bottom: 4px }
    select, input { width: 100%; padding: 8px 10px; border: 1px solid #333; border-radius: 6px; background: #1a1a1a; color: #e0e0e0; font-size: 14px; margin-bottom: 12px }
    select:focus, input:focus { outline: none; border-color: #666 }
    .row { display: flex; gap: 12px }
    .row > * { flex: 1 }
    button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.15s }
    button:disabled { opacity: 0.4; cursor: not-allowed }
    #btn-call { background: #22c55e; color: #000; width: 100% }
    #btn-call.active { background: #ef4444 }
    #status { font-size: 13px; color: #888; margin-top: 8px; min-height: 18px }
    #status.error { color: #ef4444 }
    #status.ok { color: #22c55e }
    .transcript { margin-top: 20px; border: 1px solid #222; border-radius: 8px; background: #111; padding: 12px; min-height: 200px; max-height: 400px; overflow-y: auto; font-size: 13px; line-height: 1.6 }
    .transcript .user { color: #60a5fa }
    .transcript .assistant { color: #a78bfa }
    .transcript .system { color: #666; font-style: italic }
    .transcript .entry { margin-bottom: 4px }
    .level-meter { height: 4px; background: #222; border-radius: 2px; margin-top: 8px; overflow: hidden }
    .level-meter .bar { height: 100%; background: #22c55e; width: 0%; transition: width 0.1s }
  </style>
</head>
<body>
  <h1>VoiceClaw Relay Test</h1>
  <p class="subtitle">Test the realtime voice pipeline from your browser</p>

  <div class="section">
    <label>Provider</label>
    <select id="provider">
      <option value="echo">Echo (loopback test)</option>
      <option value="openai" selected>OpenAI Realtime</option>
    </select>
  </div>

  <div class="section">
    <label>Brain Agent</label>
    <select id="brain-agent">
      <option value="none">None</option>
      <option value="enabled">Enabled</option>
    </select>
  </div>

  <div class="section row">
    <div>
      <label>OpenClaw Gateway URL</label>
      <input id="gateway-url" type="text" placeholder="http://localhost:18789" value="">
    </div>
    <div>
      <label>Auth Token</label>
      <input id="auth-token" type="password" placeholder="Bearer token">
    </div>
  </div>

  <div class="section">
    <label>Voice</label>
    <select id="voice">
      <option value="alloy">Alloy (F)</option>
      <option value="ash">Ash (M)</option>
      <option value="ballad">Ballad (M)</option>
      <option value="coral">Coral (F)</option>
      <option value="echo">Echo (M)</option>
      <option value="sage" selected>Sage (F)</option>
      <option value="shimmer">Shimmer (F)</option>
      <option value="verse">Verse (M)</option>
    </select>
  </div>

  <button id="btn-call">Start Call</button>
  <div class="level-meter"><div class="bar" id="level-bar"></div></div>
  <div id="status"></div>

  <div class="transcript" id="transcript">
    <div class="entry system">Ready. Click "Start Call" to begin.</div>
  </div>

  <script>
    const SAMPLE_RATE = 24000
    const FRAME_SIZE = 2400 // 100ms at 24kHz

    let ws = null
    let audioCtx = null
    let micStream = null
    let workletNode = null
    let playbackQueue = []
    let isPlaying = false
    let isActive = false

    const btnCall = document.getElementById("btn-call")
    const statusEl = document.getElementById("status")
    const transcriptEl = document.getElementById("transcript")
    const levelBar = document.getElementById("level-bar")

    function setStatus(msg, type = "") {
      statusEl.textContent = msg
      statusEl.className = type
    }

    function addTranscript(role, text) {
      const div = document.createElement("div")
      div.className = "entry " + role
      div.textContent = (role === "user" ? "You: " : role === "assistant" ? "AI: " : "") + text
      transcriptEl.appendChild(div)
      transcriptEl.scrollTop = transcriptEl.scrollHeight
    }

    btnCall.onclick = () => {
      if (isActive) {
        stopCall()
      } else {
        startCall()
      }
    }

    async function startCall() {
      isActive = true
      btnCall.textContent = "End Call"
      btnCall.classList.add("active")
      setStatus("Connecting...", "")

      try {
        // Set up audio context at 24kHz
        audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })

        // Get mic
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true }
        })

        // Register worklet for mic capture
        await audioCtx.audioWorklet.addModule(createWorkletURL())
        const source = audioCtx.createMediaStreamSource(micStream)
        workletNode = new AudioWorkletProcessor_polyfill(audioCtx, source)

        // Connect WebSocket
        const wsUrl = location.origin.replace(/^http/, "ws") + "/ws"
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setStatus("Connected, configuring session...", "ok")
          ws.send(JSON.stringify({
            type: "session.config",
            provider: document.getElementById("provider").value,
            voice: document.getElementById("voice").value,
            brainAgent: document.getElementById("brain-agent").value,
            openclawGatewayUrl: document.getElementById("gateway-url").value || "http://localhost:18789",
            openclawAuthToken: document.getElementById("auth-token").value || "test-token",
            deviceContext: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: navigator.language,
              deviceModel: "Browser Test"
            }
          }))
        }

        ws.onmessage = (e) => {
          const event = JSON.parse(e.data)
          handleRelayEvent(event)
        }

        ws.onerror = () => setStatus("WebSocket error", "error")
        ws.onclose = () => {
          setStatus("Disconnected", "")
          stopCall()
        }
      } catch (err) {
        setStatus("Error: " + err.message, "error")
        stopCall()
      }
    }

    function stopCall() {
      isActive = false
      btnCall.textContent = "Start Call"
      btnCall.classList.remove("active")

      if (ws && ws.readyState === WebSocket.OPEN) ws.close()
      ws = null

      if (workletNode) workletNode.stop()
      workletNode = null

      if (micStream) micStream.getTracks().forEach(t => t.stop())
      micStream = null

      if (audioCtx) audioCtx.close()
      audioCtx = null

      playbackQueue = []
      isPlaying = false
      levelBar.style.width = "0%"
    }

    function handleRelayEvent(event) {
      switch (event.type) {
        case "session.ready":
          setStatus("Session ready: " + event.sessionId, "ok")
          addTranscript("system", "Session started")
          break
        case "audio.delta":
          queuePlayback(event.data)
          break
        case "transcript.delta":
          // Live streaming transcript — skip for now, wait for done
          break
        case "transcript.done":
          addTranscript(event.role, event.text)
          break
        case "turn.started":
          // User started speaking — barge-in, stop playback
          playbackQueue = []
          isPlaying = false
          break
        case "turn.ended":
          break
        case "tool.call":
          addTranscript("system", "Tool call: " + event.name)
          break
        case "tool.progress":
          addTranscript("system", "Tool progress: " + event.summary)
          break
        case "session.rotating":
          addTranscript("system", "Session rotating...")
          break
        case "session.rotated":
          addTranscript("system", "Session rotated: " + event.sessionId)
          break
        case "error":
          setStatus("Error: " + event.message + " (" + event.code + ")", "error")
          addTranscript("system", "Error: " + event.message)
          break
      }
    }

    // PCM16 playback
    function queuePlayback(base64Data) {
      const binary = atob(base64Data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const pcm16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768

      playbackQueue.push(float32)
      if (!isPlaying) drainPlaybackQueue()
    }

    function drainPlaybackQueue() {
      if (!audioCtx || playbackQueue.length === 0) {
        isPlaying = false
        return
      }
      isPlaying = true
      const samples = playbackQueue.shift()
      const buffer = audioCtx.createBuffer(1, samples.length, SAMPLE_RATE)
      buffer.copyToChannel(samples, 0)
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(audioCtx.destination)
      source.onended = () => drainPlaybackQueue()
      source.start()
    }

    // Mic capture via ScriptProcessor (worklet polyfill for simplicity)
    function AudioWorkletProcessor_polyfill(ctx, source) {
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      let buffer = new Float32Array(0)

      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)

        // Update level meter
        let sum = 0
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
        const rms = Math.sqrt(sum / input.length)
        levelBar.style.width = Math.min(100, rms * 500) + "%"

        // Accumulate and send in FRAME_SIZE chunks
        const merged = new Float32Array(buffer.length + input.length)
        merged.set(buffer)
        merged.set(input, buffer.length)
        buffer = merged

        while (buffer.length >= FRAME_SIZE) {
          const frame = buffer.slice(0, FRAME_SIZE)
          buffer = buffer.slice(FRAME_SIZE)

          // Convert float32 to PCM16
          const pcm16 = new Int16Array(frame.length)
          for (let i = 0; i < frame.length; i++) {
            const s = Math.max(-1, Math.min(1, frame[i]))
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }

          // Base64 encode
          const bytes = new Uint8Array(pcm16.buffer)
          let binary = ""
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          const base64 = btoa(binary)

          ws.send(JSON.stringify({ type: "audio.append", data: base64 }))
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      return {
        stop: () => {
          processor.disconnect()
          source.disconnect()
        }
      }
    }

    function createWorkletURL() {
      // Dummy — we use ScriptProcessor instead
      const blob = new Blob(["class P extends AudioWorkletProcessor{process(){return true}}registerProcessor('p',P)"], { type: "application/javascript" })
      return URL.createObjectURL(blob)
    }
  </script>
</body>
</html>`
}
