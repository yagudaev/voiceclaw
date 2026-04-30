const MIN_ROWS = 1
const MAX_ROWS = 6
const LINE_HEIGHT_PX = 20
const VERTICAL_PADDING_PX = 16

export function normalizeComposerText(value: string): string {
  return value.replace(/[ \t\r\n]+$/u, '')
}

export function isSubmittable(value: string): boolean {
  return normalizeComposerText(value).length > 0
}

export function computeTextareaHeight(value: string): number {
  const lines = Math.max(MIN_ROWS, value.split('\n').length)
  const clamped = Math.min(MAX_ROWS, lines)
  return clamped * LINE_HEIGHT_PX + VERTICAL_PADDING_PX
}

export const COMPOSER_LIMITS = {
  minRows: MIN_ROWS,
  maxRows: MAX_ROWS,
  lineHeightPx: LINE_HEIGHT_PX,
  verticalPaddingPx: VERTICAL_PADDING_PX,
}
