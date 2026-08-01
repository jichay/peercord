import DOMPurify from 'isomorphic-dompurify';

export function sanitizeAndParseURLs(text: string): string {
  // 1. Sanitize text string completely to avoid any HTML tags (XSS protection)
  const sanitizedText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });

  // 2. Transform URLs in a single pass
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  
  const parsedHtml = sanitizedText.replace(urlRegex, (url) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return `<img src="${url}" alt="image preview" class="message-image clickable-image" loading="lazy" />`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // 3. Sanitize the final HTML
  return DOMPurify.sanitize(parsedHtml, {
    ALLOWED_TAGS: ['img', 'a'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'loading', 'href', 'target', 'rel', 'style'],
  });
}
