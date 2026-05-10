import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/db', () => ({
  getSetting: async () => null,
}))

vi.mock('../../lib/use-realtime', () => ({
  useRealtime: () => ({
    start: () => {},
    stop: () => {},
    setMuted: () => {},
    setOutputMuted: () => {},
    isConnected: false,
    isReconnecting: false,
    sessionId: null,
  }),
}))

const { buildIntroPrompt, extractFirstName } = await import('./StepIntroduction')

describe('buildIntroPrompt', () => {
  it("interpolates the agent's name into the greeting line", () => {
    const prompt = buildIntroPrompt('Pam')
    expect(prompt).toContain("Hi! I'm Pam.")
    expect(prompt).toMatch(/onboarding with a brand-new user/i)
  })

  it('forbids tool use', () => {
    const prompt = buildIntroPrompt('Pam')
    expect(prompt).toMatch(/Do NOT call any tools/)
  })
})

describe('extractFirstName', () => {
  const cases: Array<[string, string]> = [
    ['Michael', 'Michael'],
    ['Michael.', 'Michael'],
    ["I'm Michael", 'Michael'],
    ['I am Michael', 'Michael'],
    ['My name is Michael Yagudaev', 'Michael'],
    ['Call me Mike.', 'Mike'],
    ["It's Sage", 'Sage'],
    ['this is Beatrix', 'Beatrix'],
    ['michael', 'Michael'],
    ['MICHAEL', 'Michael'],
    ['', ''],
    ['   ', ''],
  ]

  for (const [input, expected] of cases) {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(extractFirstName(input)).toBe(expected)
    })
  }
})
