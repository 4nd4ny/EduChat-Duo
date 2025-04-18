// /utils/sanitize.ts
/**
 * Sanitize a string to prevent XSS attacks and other security issues
 * @param str - The string to sanitize
 * @param maxLength - Maximum length allowed (truncates if longer)
 * @param allowedTags - Optional HTML tags to allow (if any)
 * @returns Sanitized string
 */
export function sanitizeString(
  str: string, 
  maxLength: number, 
  allowedTags: string[] = []
): string {
  if (typeof str !== 'string') {
    return '';
  }
  
  // First convert str to string if it's not already
  let sanitized = String(str);
  
  // Basic HTML entity encoding for dangerous characters
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  // Replace special characters with HTML entities
  sanitized = sanitized.replace(/[&<>"'`=\/]/g, (char) => htmlEntities[char]);
  
  // Allow specific HTML tags back in if requested
  if (allowedTags.length > 0) {
    // This creates a RegExp to find encoded versions of allowed tags and restore them
    const allowedTagsRegex = new RegExp(
      allowedTags.map(tag => 
        `(&lt;${tag}( [^&]*)?&gt;)|(&lt;\\/${tag}&gt;)`
      ).join('|'),
      'g'
    );
    
    sanitized = sanitized.replace(allowedTagsRegex, match => {
      // Convert the encoded HTML back to its original form
      return match
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#x60;/g, '`')
        .replace(/&#x3D;/g, '=');
    });
  }
  
  // Remove JavaScript event handlers and potentially dangerous attributes
  sanitized = sanitized.replace(
    /on\w+="[^"]*"|javascript:|data:|vbscript:|expression\(|@import|document\./gi, 
    ''
  );
  
  // Clean up potentially problematic URL schemes
  sanitized = sanitized.replace(
    /(href|src|action)=["'](?!https?:\/\/|mailto:|tel:|\/\/|\/)[^"']*["']/gi,
    match => match.replace(/=["'][^"']*["']/g, '="javascript:void(0)"')
  );
  
  // Truncate to maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    
    // Avoid cutting in the middle of an HTML entity
    const lastAmpersandPos = sanitized.lastIndexOf('&');
    if (lastAmpersandPos !== -1 && !sanitized.substring(lastAmpersandPos).includes(';')) {
      sanitized = sanitized.substring(0, lastAmpersandPos);
    }
  }
  
  return sanitized;
}