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

import type { InboxItem } from "../types/index.js";

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
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  // Limit field length to prevent token-stuffing attacks
  // (someone sends a 100KB email body to burn through the context window)
  const MAX_FIELD_LENGTH = 2000;
  if (sanitized.length > MAX_FIELD_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FIELD_LENGTH) + "...[truncated]";
  }

  return sanitized;
}

/**
 * Sanitize all text fields in an inbox item before AI processing.
 */
export function sanitizeInboxItem<
  T extends { sender: string; subject: string; content: string },
>(item: T): T {
  return {
    ...item,
    sender: sanitizeField(item.sender),
    subject: sanitizeField(item.subject),
    content: sanitizeField(item.content),
  };
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g;
const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+\b/gi;
const MAX_CONTENT_LENGTH = 500;
const MAX_ITEMS = 50;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyPiiMasking(text: string, sender?: string): string {
  let masked = text;

  if (sender && sender.trim().length > 0) {
    const senderPattern = new RegExp(
      `\\b${escapeRegex(sender.trim())}\\b`,
      "gi",
    );
    masked = masked.replace(senderPattern, "[SENDER]");
  }

  masked = masked.replace(EMAIL_REGEX, "[EMAIL]");
  masked = masked.replace(PHONE_REGEX, "[PHONE]");
  masked = masked.replace(URL_REGEX, "[URL]");

  return masked;
}

/**
 * Masks PII before data is sent to the LLM.
 * This should only be applied to prompt-bound data, never user-visible data.
 */
export function maskPII(items: InboxItem[]): InboxItem[] {
  return [...items]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const sanitizedItem = sanitizeInboxItem(item);
      const maskedSubject = applyPiiMasking(sanitizedItem.subject, item.sender);
      const maskedContent = applyPiiMasking(sanitizedItem.content, item.sender);

      return {
        ...sanitizedItem,
        sender: "[SENDER]",
        subject: maskedSubject,
        content:
          maskedContent.length > MAX_CONTENT_LENGTH
            ? maskedContent.slice(0, MAX_CONTENT_LENGTH)
            : maskedContent,
      };
    });
}
