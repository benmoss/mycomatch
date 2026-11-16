/**
 * Normalize common name capitalization to title case
 * Handles hyphenated words properly (e.g., "jack-o'-lantern" -> "Jack-O'-Lantern")
 */
export function normalizeCommonName(name: string): string {
  return name
    .split(' ')
    .map(word => {
      // Handle hyphenated words by capitalizing each part
      return word
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
}
