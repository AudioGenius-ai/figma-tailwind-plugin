/**
 * Converts a style name to a CSS variable-friendly format
 * Example: "Primary/Hover" -> "primary-hover"
 */
export function styleNameToVariable(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a valid React component name from a Figma node name
 * Example: "Button/Primary" -> "ButtonPrimary"
 */
export function generateComponentName(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
    .replace(/^[^a-zA-Z]+/, '')
    || 'Component';
} 