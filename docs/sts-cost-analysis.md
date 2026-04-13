# STS Provider Cost Analysis

## Audio Token Rates

| Provider | Input rate | Output rate | Silence charged? |
|---|---|---|---|
| OpenAI Realtime | 10 tokens/sec (1 per 100ms) | 20 tokens/sec (1 per 50ms) | No (VAD filters it) |
| Gemini Live | 32 tokens/sec | 32 tokens/sec | Yes (continuous processing) |

## Pricing Per Million Tokens

| Model | Audio input | Audio output | Cached input |
|---|---|---|---|
| gpt-realtime | $32 | $64 | $0.40 |
| gpt-realtime-mini | $10 | $20 | $0.30 |
| Gemini Live (2.5 Flash) | $3 | $12 | — |

## Cost Per Hour (Balanced Conversation)

Assumes ~1 hour of active speech on both sides.

| | OpenAI (full) | OpenAI mini | Gemini Live |
|---|---|---|---|
| Input | 36K tokens = $1.15 | 36K tokens = $0.36 | 115K tokens = $0.35 |
| Output | 72K tokens = $4.61 | 72K tokens = $1.44 | 115K tokens = $1.38 |
| **Total/hr** | **$5.76** | **$1.80** | **$1.73** |

## Long Session Costs (24 Hours Connected)

The key difference: OpenAI only charges for speech, Gemini charges for all audio including silence.

### 1 hour of talking in a 24-hour session

| | OpenAI mini | Gemini Live |
|---|---|---|
| Input | 1hr speech: 36K tokens = $0.36 | 24hr continuous: 2.76M tokens = $8.30 |
| Output | 1hr speech: 72K tokens = $1.44 | 1hr speech: 115K tokens = $1.38 |
| **Total** | **$1.80** | **$9.68** |

### 10 minutes of talking in a 24-hour session

| | OpenAI mini | Gemini Live |
|---|---|---|
| Input | 10min speech: 6K tokens = $0.06 | 24hr continuous: 2.76M tokens = $8.30 |
| Output | 10min speech: 12K tokens = $0.24 | 10min speech: 19.2K tokens = $0.23 |
| **Total** | **$0.30** | **$8.53** |

## Key Takeaways

- **Active conversation:** Gemini is slightly cheaper per hour ($1.73 vs $1.80 on mini)
- **Long idle sessions:** OpenAI is dramatically cheaper because silence is free
- **Session rotation overhead:** Gemini reconnects every ~10 min (144x in 24hr), OpenAI every ~60 min (24x). Each rotation re-sends context summary as text tokens — minor but adds up on Gemini
- **Recommendation:** Start with `gpt-realtime-mini` for MVP. Offer Gemini as a cheaper option for active, shorter sessions

## Sources

- [OpenAI Realtime API — Managing Costs](https://developers.openai.com/api/docs/guides/realtime-costs)
- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini Live API — Silence Billing](https://discuss.ai.google.dev/t/live-api-pricing-audio-tokens-second-silent-audio/92653)
