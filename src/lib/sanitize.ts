/**
 * XSS Protection - Input Sanitization
 * Uses DOMPurify to sanitize all user-generated content
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify for strict sanitization
const config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title', 'class'
  ],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
};

/**
 * Sanitize HTML content
 * Use for: note content, descriptions, any rich text
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize plain text - removes ALL HTML
 * Use for: titles, names, single-line inputs
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return '';
  // Remove all HTML tags
  return dirty.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  const sanitized = email.trim().toLowerCase();
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}
