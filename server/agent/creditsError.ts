/**
 * Recognize LiteLLM / gateway budget-cap errors so the chat UI can offer
 * a buy-credits path instead of a generic failure bubble.
 */
const CREDITS_PATTERNS = [
  /budget.*exceed/i,
  /exceed.*budget/i,
  /max[_\s-]?budget/i,
  /insufficient.*credit/i,
  /insufficient.*budget/i,
  /out of credits/i,
  /not enough credits/i,
  /user key budget/i,
  /exceededbudget/i,
];

export function isCreditsInsufficientError(message: string): boolean {
  return CREDITS_PATTERNS.some((pattern) => pattern.test(message));
}

export function creditsInsufficientMessage(): string {
  return "You've used all your inference credits for this billing period.";
}
