import { describe, it, expect, vi } from 'vitest';
import { sanitizeAndParseURLs } from './parser';

vi.mock('isomorphic-dompurify', () => {
  return {
    default: {
      sanitize: (str: string, config: any) => {
        if (config && config.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
          return str.replace(/<[^>]*>/g, '').trim();
        }
        return str; // If tags are allowed, just return it for the sake of the parser test.
      },
    }
  };
});

describe('sanitizeAndParseURLs', () => {
  it('should escape html tags', () => {
    const input = 'Hello <b>world</b> <script>alert(1)</script>';
    const result = sanitizeAndParseURLs(input);
    expect(result).toBe('Hello world alert(1)');
  });

  it('should parse image urls', () => {
    const input = 'Look at this https://example.com/image.png';
    const result = sanitizeAndParseURLs(input);
    expect(result).toContain('<img src="https://example.com/image.png"');
    expect(result).toContain('class="message-image"');
  });

  it('should parse generic urls', () => {
    const input = 'Visit https://example.com for more info';
    const result = sanitizeAndParseURLs(input);
    expect(result).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>');
  });
});
