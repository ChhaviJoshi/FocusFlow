/**
 * Prompt injection sanitizer.
 *
 * When we feed inbox items (emails, Slack messages, Jira tickets) into the
 * Gemini prompt, a malicious actor could craft an email subject/body that
 * contains LLM instruction patterns like "Ignore all previous instructions".
 *
 * This sanitizer strips/escapes known injection patterns to reduce the attack surface.
 * It's not bulletproof (no sanitizer is), but it raises the bar significantly.
 */

// Patterns commonly used in prompt injection attacks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?:/gi,
  /system\s*prompt:/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
];

/**
 * Sanitize a single string field before it goes into an AI prompt.
 * Replaces injection patterns with harmless placeholders.
 */
export function sanitizeField(input: string): string {
  let sanitized = input;

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // Limit field length to prevent token-stuffing attacks
  // (someone sends a 100KB email body to burn through the context window)
  const MAX_FIELD_LENGTH = 2000;
  if (sanitized.length > MAX_FIELD_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FIELD_LENGTH) + '...[truncated]';
  }

  return sanitized;
}

/**
 * Sanitize all text fields in an inbox item before AI processing.
 */
export function sanitizeInboxItem<T extends { sender: string; subject: string; content: string }>(item: T): T {
  return {
    ...item,
    sender: sanitizeField(item.sender),
    subject: sanitizeField(item.subject),
    content: sanitizeField(item.content),
  };
}
