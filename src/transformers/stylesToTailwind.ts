import { StyleProperties } from '../types/styleTypes';
import { DesignTokens, ColorToken } from '../types/designTokenTypes';
import { styleNameToVariable } from '../utils/nameUtils';

// Helper function to normalize flex property values
function normalizeFlexValue(property: string, value: string): string {
  // Remove 'flex-' prefix from values like 'flex-start', 'flex-end'
  if (value.startsWith('flex-')) {
    return value.substring(5); // Remove 'flex-' prefix
  }
  
  // Handle 'space-between', 'space-around', etc.
  if (value.startsWith('space-')) {
    return value;
  }
  
  // Handle special cases
  if (property === 'justifyContent' && value === 'start') {
    return 'start';
  }
  
  if (property === 'alignItems' && value === 'start') {
    return 'start';
  }
  
  return value;
}

// Tailwind default colors - a subset focusing on the most commonly used colors
const TAILWIND_COLORS = {
  // Gray scale
  black: '#000000',
  white: '#FFFFFF',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  // Primary colors
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
};

// Helper function to calculate the color distance (simple Euclidean in RGB space)
function colorDistance(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) + 
    Math.pow(color1.g - color2.g, 2) + 
    Math.pow(color1.b - color2.b, 2)
  );
}

// Helper function to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number; a?: number } | null {
  hex = hex.toLowerCase().trim();
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Expand shorthand hex (e.g. #fff to #ffffff)
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  } else if (hex.length === 4) {
    // Handle #rgba shorthand
    const [r, g, b, a] = hex.split('');
    hex = r + r + g + g + b + b + a + a;
  }
  
  // Check for hex with alpha
  let r, g, b, a;
  if (hex.length === 8) {
    // Format: #RRGGBBAA
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16) / 255; // Convert alpha to 0-1 range
    return { r, g, b, a };
  } else if (hex.length === 6) {
    // Standard #RRGGBB format
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }
  
  return null;
}

// Helper function to parse RGB color to components
function parseRgb(color: string): { r: number; g: number; b: number; a?: number } | null {
  // Handle rgb format
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10) / 255,
      g: parseInt(rgbMatch[2], 10) / 255,
      b: parseInt(rgbMatch[3], 10) / 255
    };
  }

  // Handle rgba format
  const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      a: parseFloat(rgbaMatch[4])
    };
  }

  return null;
}

// Helper function to match a color to the nearest Tailwind color
function matchToTailwindColor(color: string): { name: string; shade: string; opacity?: number } | null {
  // Try to parse the color to RGB
  let rgb: { r: number; g: number; b: number; a?: number } | null = null;
  
  if (color.startsWith('#')) {
    rgb = hexToRgb(color);
  } else if (color.startsWith('rgb')) {
    rgb = parseRgb(color);
  }
  
  if (!rgb) return null;
  
  let closestColor = null;
  let closestShade = null;
  let minDistance = Infinity;
  
  // Special cases for black and white
  if (colorDistance(rgb, hexToRgb(TAILWIND_COLORS.black)!) < 30) {
    return { 
      name: 'black', 
      shade: '',
      opacity: rgb.a !== undefined && rgb.a < 1 ? rgb.a : undefined
    };
  }
  
  if (colorDistance(rgb, hexToRgb(TAILWIND_COLORS.white)!) < 30) {
    return { 
      name: 'white', 
      shade: '',
      opacity: rgb.a !== undefined && rgb.a < 1 ? rgb.a : undefined
    };
  }
  
  // Check all color palettes
  for (const [colorName, shades] of Object.entries(TAILWIND_COLORS)) {
    if (colorName === 'black' || colorName === 'white') continue;
    
    for (const [shade, hexValue] of Object.entries(shades)) {
      const tailwindRgb = hexToRgb(hexValue as string);
      if (!tailwindRgb) continue;
      
      const distance = colorDistance(rgb, tailwindRgb);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = colorName;
        closestShade = shade;
      }
    }
  }
  
  // Only return a match if it's reasonably close (threshold of 30 in RGB space is approximate)
  if (minDistance < 30 && closestColor && closestShade) {
    return { 
      name: closestColor, 
      shade: closestShade,
      opacity: rgb.a !== undefined && rgb.a < 1 ? rgb.a : undefined
    };
  }
  
  return null;
}

// Helper function to parse padding/margin shorthand values
function parseSpacingShorthand(value: string): { top: string; right: string; bottom: string; left: string } | null {
  if (!value) return null;
  
  // Remove 'px' and split by spaces
  const values = value.replace(/px/g, '').trim().split(/\s+/);
  
  if (values.length === 1) {
    // Single value: apply to all sides
    return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
  } else if (values.length === 2) {
    // Two values: top/bottom, left/right
    return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
  } else if (values.length === 3) {
    // Three values: top, left/right, bottom
    return { top: values[0], right: values[1], bottom: values[2], left: values[1] };
  } else if (values.length === 4) {
    // Four values: top, right, bottom, left
    return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
  }
  
  return null;
}

// Helper function to convert px value to Tailwind spacing
function pxToTailwindSpacing(px: string): string {
  const value = parseInt(px);
  
  // Map common pixel values to Tailwind spacing scale
  const spacingMap: Record<number, string> = {
    0: '0',
    1: '0.5',
    2: '0.5',
    3: '0.75',
    4: '1',
    6: '1.5',
    8: '2',
    10: '2.5',
    12: '3',
    14: '3.5',
    16: '4',
    20: '5',
    24: '6',
    28: '7',
    32: '8',
    36: '9',
    40: '10',
    44: '11',
    48: '12',
    56: '14',
    64: '16',
    72: '18',
    80: '20',
    96: '24'
  };
  
  return spacingMap[value] || `[${px}px]`;
}

// Helper function to extract color from CSS variable or direct value
function extractColorValue(value: string): string | null {
  if (!value) return null;
  
  // Check if it's a CSS variable
  if (value.startsWith('var(--color-')) {
    // Extract the variable name from var(--color-some-color)
    const match = value.match(/var\(--color-([^)]+)\)/);
    if (match && match[1]) {
      return match[1]; // Return the variable name without the prefix
    }
  }
  
  // Check if it's a hex color
  if (value.startsWith('#')) {
    return value;
  }
  
  // Check if it's an RGB/RGBA color
  if (value.startsWith('rgb')) {
    return value;
  }
  
  return value;
}

// Helper function to find matching color in design tokens
export function findMatchingColor(color: string, tokens: DesignTokens): string | null {
  if (!color) return null;
  
  // Normalize the color value
  const normalizedColor = color.toLowerCase().trim();
  
  // First, try to find a direct match with a token name
  for (const [tokenName, tokenData] of Object.entries(tokens.colors)) {
    const tokenNameNormalized = styleNameToVariable(tokenName);
    const tokenValue = tokenData.value as string;
    
    // If the color matches a token name directly
    if (normalizedColor === tokenNameNormalized) {
      return tokenNameNormalized;
    }
    
    // If the color is a CSS variable that matches a token
    if (normalizedColor.includes(tokenNameNormalized)) {
      return tokenNameNormalized;
    }
    
    // If the tokenValue matches the color
    const tokenValueLower = tokenValue.toLowerCase();
    
    // Check if the color value contains the token value (for hex codes)
    if (normalizedColor === tokenValueLower || normalizedColor.includes(tokenValueLower)) {
      return tokenNameNormalized;
    }
    
    // Handle CSS variables
    if (tokenValueLower.includes('var(--color-') && normalizedColor.includes(tokenNameNormalized)) {
      return tokenNameNormalized;
    }
  }
  
  // If no direct match, try to match by RGB values
  if (normalizedColor.startsWith('rgb')) {
    const rgbMatch = normalizedColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch;
      
      // Look through all color tokens to find a close match
      for (const [tokenName, tokenData] of Object.entries(tokens.colors)) {
        const tokenNameNormalized = styleNameToVariable(tokenName);
        const tokenValue = tokenData.value as string;
        
        if (tokenValue.includes(`${r}, ${g}, ${b}`)) {
          return tokenNameNormalized;
        }
      }
    }
  }
  
  // If no match found, return null
  return null;
}

/**
 * Converts a color string to RGB/RGBA format
 * This function tries multiple methods to extract RGB values from different color formats
 */
function getRgba(value: string): string | null {
  // If already in RGB/RGBA format, return as is
  if (value.startsWith('rgb')) {
    return value;
  }
  
  // Try to parse as hex
  if (value.startsWith('#')) {
    const rgb = hexToRgb(value);
    if (rgb) {
      const r = Math.round(rgb.r * 255);
      const g = Math.round(rgb.g * 255);
      const b = Math.round(rgb.b * 255);
      
      if (rgb.a !== undefined && rgb.a < 1) {
        return `rgba(${r}, ${g}, ${b}, ${rgb.a})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  }
  
  // Fallback to Figma utility if available
  try {
    if (typeof figma !== 'undefined' && figma.util && figma.util.rgba) {
      const colorObj = figma.util.rgba(value);
      if (typeof colorObj === 'object') {
        const r = Math.round(colorObj.r * 255);
        const g = Math.round(colorObj.g * 255);
        const b = Math.round(colorObj.b * 255);
        
        if (colorObj.a !== undefined && colorObj.a < 1) {
          return `rgba(${r}, ${g}, ${b}, ${colorObj.a})`;
        } else {
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      return null;
    }
  } catch (error) {
    console.error('Error extracting RGBA values:', error);
  }
  
  return null;
}

// Helper function to map pixel radius to Tailwind's border radius scale
function mapRadiusToTailwind(radiusValue: number): string | null {
  if (radiusValue === 0) {
    return null;  // Don't add any class for zero radius
  } else if (radiusValue <= 2) {
    return 'sm';
  } else if (radiusValue <= 4) {
    return '';  // default rounded
  } else if (radiusValue <= 6) {
    return 'md';
  } else if (radiusValue <= 8) {
    return 'lg';
  } else if (radiusValue <= 12) {
    return 'xl';
  } else if (radiusValue <= 16) {
    return '2xl';
  } else if (radiusValue <= 24) {
    return '3xl';
  } else {
    return 'full';
  }
}

/**
 * Finds a matching design token for a given value and token type
 * @param value The value to find a matching token for
 * @param tokenType The type of token to look for
 * @param tokens The design tokens to search within
 * @returns The normalized token name if found, null otherwise
 */
export function findMatchingToken(
  value: string, 
  tokenType: 'colors' | 'typography' | 'spacing' | 'effects' | 'borderRadius',
  tokens: DesignTokens
): string | null {
  // Skip if value is not provided
  if (!value) return null;
  
  // Normalize the value for comparison
  const normalizedValue = value.toLowerCase().trim();
  
  // For colors, standardize to RGB/RGBA format
  let standardizedValue = normalizedValue;
  if (tokenType === 'colors' && !normalizedValue.startsWith('var(')) {
    const rgbaValue = getRgba(normalizedValue);
    if (rgbaValue) {
      standardizedValue = rgbaValue.toLowerCase();
    }
  }
  
  // Try to find a direct match in the design tokens
  for (const [tokenName, tokenData] of Object.entries(tokens[tokenType])) {
    const tokenNameNormalized = styleNameToVariable(tokenName);
    
    // For colors, check if the value matches the token name or is close to the hex value
    if (tokenType === 'colors') {
      const tokenValue = (tokenData as ColorToken).value as string;
      
      // Convert token value to RGB for comparison if needed
      let standardizedTokenValue = tokenValue.toLowerCase();
      if (!standardizedTokenValue.startsWith('var(')) {
        const rgbaTokenValue = getRgba(standardizedTokenValue);
        if (rgbaTokenValue) {
          standardizedTokenValue = rgbaTokenValue.toLowerCase();
        }
      }

      // Check for exact name match
      if (normalizedValue === tokenNameNormalized) {
        return tokenNameNormalized;
      }
      
      // Check for name with spaces replaced by dashes
      if (normalizedValue.replace(/\s+/g, '-') === tokenNameNormalized) {
        return tokenNameNormalized;
      }
      
      // If both values are in RGB/RGBA format, compare them
      if (standardizedValue.startsWith('rgb') && standardizedTokenValue.startsWith('rgb')) {
        const valueRgb = parseRgb(standardizedValue);
        const tokenRgb = parseRgb(standardizedTokenValue);
        
        if (valueRgb && tokenRgb && colorDistance(valueRgb, tokenRgb) < 10) {
          return tokenNameNormalized;
        }
      }
      
      // Check if the exact color value matches
      if (standardizedValue === standardizedTokenValue) {
        return tokenNameNormalized;
      }
    } else {
      // For other token types, just check the name
      if (normalizedValue === tokenNameNormalized || 
          normalizedValue.replace(/\s+/g, '-') === tokenNameNormalized) {
        return tokenNameNormalized;
      }
    }
  }
  
  return null;
}

export function stylesToTailwind(styles: StyleProperties, tokens: DesignTokens): string {
  const tailwindClasses: string[] = [];
  // Track which properties we've already added to avoid duplicates
  const addedProperties = new Set<string>();
  
  // Disable the generation of all color classes for debugging
  const debugMode = false;
  const debugAllColors = false; // Set this to false to prevent generating all color classes
  
  // Skip adding background colors if they weren't explicitly specified
  const skipImplicitBackgrounds = true;
  
  // Helper function to find matching token - delegate to the exported function
  const findToken = (value: string, tokenType: 'colors' | 'typography' | 'spacing' | 'effects' | 'borderRadius'): string | null => {
    return findMatchingToken(value, tokenType, tokens);
  };
  
  // First check if we have style references
  const hasStyleReferences = Boolean(styles.styleReferences);
  const hasBgStyleReference = Boolean(styles.styleReferences?.fill);
  const hasExplicitBgColor = Boolean(styles.backgroundColor);
  
  // Handle transparent backgrounds
  if (styles.backgroundColor === 'transparent' || 
      (styles.styleReferences?.fill && styles.styleReferences.fill.toLowerCase().includes('transparent'))) {
    tailwindClasses.push('bg-transparent');
    addedProperties.add('backgroundColor');
  }
  
  // Only add background colors if they were explicitly specified
  const shouldAddBackgroundColor = hasBgStyleReference || hasExplicitBgColor || !skipImplicitBackgrounds;
  
  // Handle style references first
  if (styles.styleReferences) {
    // Fill styles (background colors)
    if (styles.styleReferences.fill && shouldAddBackgroundColor) {
      const tokenName = styleNameToVariable(styles.styleReferences.fill);
      
      // Check if this is actually a text color token by looking at naming patterns
      const isTextToken = tokenName.includes('text-') || 
                          styles.styleReferences.fill.includes('text') ||
                          (styles.color && !styles.backgroundColor); // If it has color but no background, likely text
                          
      // Check for tokens by name
      if (tokens.colors[tokenName] || tokens.colors[styles.styleReferences.fill]) {
        if (isTextToken) {
          // Use text- prefix for text color tokens
          tailwindClasses.push(`text-${tokenName.replace('text-', '')}`);
          addedProperties.add('color');
        } else {
          // Use bg- prefix for background color tokens
          tailwindClasses.push(`bg-${tokenName}`);
          addedProperties.add('backgroundColor');
        }
      } else {
        // Try to find a matching color using pattern matching
        // System colors like "Default/SystemGray/02/Light" need special handling
        const colorMatch = findToken(styles.styleReferences.fill, 'colors');
        if (colorMatch) {
          tailwindClasses.push(`bg-${colorMatch}`);
          addedProperties.add('backgroundColor');
        } else if (styles.styleReferences.fill.includes('SystemGray')) {
          // Handle system gray colors by extracting the number and mapping to appropriate gray shade
          // Format could be: Default/SystemGray/02/Light or SystemGray02 or other variations
          const grayMatch = styles.styleReferences.fill.match(/SystemGray\/(\d+)\/?(Light|Dark)?|SystemGray(\d+)/i);
          if (grayMatch) {
            // Extract the gray level number from whichever capturing group matched
            const grayNum = grayMatch[1] || grayMatch[3];
            if (grayNum) {
              const grayLevel = parseInt(grayNum, 10);
              // Map system gray levels to Tailwind gray levels (approximate mapping)
              // For number formats like "02", this will convert correctly
              const tailwindGrayLevel = Math.min(Math.max(grayLevel * 100, 100), 900);
              tailwindClasses.push(`bg-gray-${tailwindGrayLevel}`);
              addedProperties.add('backgroundColor');
            } else {
              // Default to a medium gray if we can't extract the level
              tailwindClasses.push('bg-gray-400');
              addedProperties.add('backgroundColor');
            }
          } else {
            // If we can't parse it at all, default to a medium gray
            tailwindClasses.push('bg-gray-400');
            addedProperties.add('backgroundColor');
          }
        }
      }
    }
    
    // Text styles (typography)
    if (styles.styleReferences.text) {
      const tokenName = styleNameToVariable(styles.styleReferences.text);
      if (tokens.typography[tokenName] || tokens.typography[styles.styleReferences.text]) {
        // For typography, we need to generate multiple classes
        const fontFamily = `font-${tokenName}`;
        const fontSize = `text-${tokenName}`;
        const lineHeight = `leading-${tokenName}`;
        const letterSpacing = `tracking-${tokenName}`;
        
        tailwindClasses.push(fontFamily, fontSize, lineHeight, letterSpacing);
      }
    }
    
    // Effect styles (shadows)
    if (styles.styleReferences.effect) {
      const tokenName = styleNameToVariable(styles.styleReferences.effect);
      if (tokens.effects[tokenName] || tokens.effects[styles.styleReferences.effect]) {
        tailwindClasses.push(`shadow-${tokenName}`);
      }
    }
    
    // Stroke styles (borders)
    if (styles.styleReferences.stroke) {
      const tokenName = styleNameToVariable(styles.styleReferences.stroke);
      if (tokens.colors[tokenName] || tokens.colors[styles.styleReferences.stroke]) {
        tailwindClasses.push(`border-${tokenName}`);
      }
    }
  }
  
  // Handle variables
  if (styles.variableReferences) {
    for (const [name, _] of Object.entries(styles.variableReferences)) {
      const tokenName = styleNameToVariable(name);
      
      // Check for color tokens
      if (tokens.colors[tokenName] || tokens.colors[name]) {
        // Check if this is actually a text color token
        const isTextToken = tokenName.includes('text-') || 
                            name.includes('text') ||
                            (styles.color && !styles.backgroundColor);
        
        if (isTextToken) {
          // Use text- prefix for text color tokens
          tailwindClasses.push(`text-${tokenName.replace('text-', '')}`);
          addedProperties.add('color');
        } else if (shouldAddBackgroundColor && !addedProperties.has('backgroundColor')) {
          // Use bg- prefix for background color tokens - but only if we should add background colors
          tailwindClasses.push(`bg-${tokenName}`);
          addedProperties.add('backgroundColor');
        }
        continue;
      }
      
      // Check for spacing tokens
      if (tokens.spacing[tokenName] || tokens.spacing[name]) {
        tailwindClasses.push(`space-${tokenName}`);
        continue;
      }
      
      // Check for typography tokens
      if (tokens.typography[tokenName] || tokens.typography[name]) {
        // For typography, we need to generate multiple classes
        const fontFamily = `font-${tokenName}`;
        const fontSize = `text-${tokenName}`;
        const lineHeight = `leading-${tokenName}`;
        const letterSpacing = `tracking-${tokenName}`;
        
        tailwindClasses.push(fontFamily, fontSize, lineHeight, letterSpacing);
      }
    }
  }
  
  // Only add background color if it was explicitly specified and we haven't already handled it
  if (!addedProperties.has('backgroundColor') && shouldAddBackgroundColor && styles.backgroundColor) {
    // Check for transparent background
    if (styles.backgroundColor === 'transparent') {
      tailwindClasses.push('bg-transparent');
      addedProperties.add('backgroundColor');
    } else {
      // Try to find a matching color token
      const colorValue = extractColorValue(styles.backgroundColor);
      
      if (colorValue) {
        // First try to find a token match - prioritize custom tokens
        const colorToken = findToken(styles.backgroundColor, 'colors');
        
        if (colorToken) {
          // Use the custom token
          tailwindClasses.push(`bg-${colorToken}`);
          addedProperties.add('backgroundColor');
        } else {
          // If no token match, standardize to RGB/RGBA and try Tailwind matching
          const standardizedColor = getRgba(styles.backgroundColor) || styles.backgroundColor;
          const tailwindMatch = matchToTailwindColor(standardizedColor);
          
          if (tailwindMatch) {
            // Use Tailwind color
            let colorClass = '';
            if (tailwindMatch.shade) {
              colorClass = `bg-${tailwindMatch.name}-${tailwindMatch.shade}`;
            } else {
              colorClass = `bg-${tailwindMatch.name}`;
            }
            
            // Add opacity modifier if needed
            if (tailwindMatch.opacity !== undefined) {
              const opacityValue = Math.round(tailwindMatch.opacity * 100);
              colorClass += `/${opacityValue}`;
            }
            
            tailwindClasses.push(colorClass);
            addedProperties.add('backgroundColor');
          } else {
            // Last resort: arbitrary value - use standardized color if available
            tailwindClasses.push(`bg-[${standardizedColor}]`);
            addedProperties.add('backgroundColor');
          }
        }
      } else {
        tailwindClasses.push(`bg-[${styles.backgroundColor}]`);
        addedProperties.add('backgroundColor');
      }
    }
  }
  
  // Handle opacity
  if (styles.opacity && !addedProperties.has('opacity')) {
    const opacityValue = parseFloat(styles.opacity);
    if (!isNaN(opacityValue)) {
      // Map the opacity value to the closest Tailwind opacity class
      const opacityPercent = Math.round(opacityValue * 100);
      
      // Map to the closest Tailwind opacity value
      let tailwindOpacity: number;
      if (opacityPercent <= 5) tailwindOpacity = 0;
      else if (opacityPercent <= 15) tailwindOpacity = 10;
      else if (opacityPercent <= 25) tailwindOpacity = 20;
      else if (opacityPercent <= 35) tailwindOpacity = 30;
      else if (opacityPercent <= 45) tailwindOpacity = 40;
      else if (opacityPercent <= 55) tailwindOpacity = 50;
      else if (opacityPercent <= 65) tailwindOpacity = 60;
      else if (opacityPercent <= 75) tailwindOpacity = 70;
      else if (opacityPercent <= 85) tailwindOpacity = 80;
      else if (opacityPercent <= 95) tailwindOpacity = 90;
      else tailwindOpacity = 100;
      
      // Only add the opacity class if it's not fully opaque
      if (tailwindOpacity < 100) {
        tailwindClasses.push(`opacity-${tailwindOpacity}`);
        addedProperties.add('opacity');
      }
    }
  }
  
  // Handle background image
  if (styles.backgroundImage && !addedProperties.has('backgroundImage')) {
    // Background image requires custom CSS with a URL or data URL
    // We'll use Tailwind's arbitrary value syntax
    if (styles.backgroundImageHash) {
      // Use the hash as a reference to fetch the image later
      tailwindClasses.push(`bg-[image:var(--img-${styles.backgroundImageHash})]`);
      
      // Add background size if available
      if (styles.backgroundSize) {
        tailwindClasses.push(`bg-${styles.backgroundSize}`);
      } else {
        // Default to cover
        tailwindClasses.push('bg-cover');
      }
      
      // Add background position and repeat properties if available
      if (styles.backgroundPosition) {
        tailwindClasses.push(`bg-${styles.backgroundPosition}`);
      }
      
      if (styles.backgroundRepeat) {
        tailwindClasses.push(`bg-${styles.backgroundRepeat}`);
      } else {
        // Default to no-repeat
        tailwindClasses.push('bg-no-repeat');
      }
      
      addedProperties.add('backgroundImage');
    } else if (styles.backgroundImageUrl) {
      // Use direct URL
      tailwindClasses.push(`bg-[url('${styles.backgroundImageUrl}')]`);
      
      // Add background size, position, and repeat properties if available
      if (styles.backgroundSize) {
        tailwindClasses.push(`bg-${styles.backgroundSize}`);
      }
      
      if (styles.backgroundPosition) {
        tailwindClasses.push(`bg-${styles.backgroundPosition}`);
      }
      
      if (styles.backgroundRepeat) {
        tailwindClasses.push(`bg-${styles.backgroundRepeat}`);
      } else {
        // Default to no-repeat
        tailwindClasses.push('bg-no-repeat');
      }
      
      addedProperties.add('backgroundImage');
    }
  }
  
  if (!styles.styleReferences?.text) {
    if (styles.color && !addedProperties.has('color')) {
      // Try to find a matching color token for text color
      const colorValue = extractColorValue(styles.color);
      
      if (colorValue) {
        // First try to find a token match - prioritize custom tokens
        const colorToken = findToken(styles.color, 'colors');
        
        if (colorToken) {
          // Use the custom token
          tailwindClasses.push(`text-${colorToken}`);
          addedProperties.add('color');
        } else {
          // If no token match, standardize to RGB/RGBA and try Tailwind matching
          const standardizedColor = getRgba(styles.color) || styles.color;
          const tailwindMatch = matchToTailwindColor(standardizedColor);
          
          if (tailwindMatch) {
            // Use Tailwind color
            let colorClass = '';
            if (tailwindMatch.shade) {
              colorClass = `text-${tailwindMatch.name}-${tailwindMatch.shade}`;
            } else {
              colorClass = `text-${tailwindMatch.name}`;
            }
            
            // Add opacity modifier if needed
            if (tailwindMatch.opacity !== undefined) {
              const opacityValue = Math.round(tailwindMatch.opacity * 100);
              colorClass += `/${opacityValue}`;
            }
            
            tailwindClasses.push(colorClass);
            addedProperties.add('color');
          } else {
            // Last resort: arbitrary value - use standardized color if available
            tailwindClasses.push(`text-[${standardizedColor}]`);
            addedProperties.add('color');
          }
        }
      } else {
        tailwindClasses.push(`text-[${styles.color}]`);
        addedProperties.add('color');
      }
    }
    
    if (styles.fontSize && !addedProperties.has('fontSize')) {
      const size = parseInt(styles.fontSize);
      const closestStandardSize = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96]
        .reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);
      
      const sizeMap: Record<number, string> = {
        12: 'text-xs',
        14: 'text-sm',
        16: 'text-base',
        18: 'text-lg',
        20: 'text-xl',
        24: 'text-2xl',
        30: 'text-3xl',
        36: 'text-4xl',
        48: 'text-5xl',
        60: 'text-6xl',
        72: 'text-7xl',
        96: 'text-8xl'
      };
      
      if (Math.abs(closestStandardSize - size) <= 2 && sizeMap[closestStandardSize]) {
        tailwindClasses.push(sizeMap[closestStandardSize]);
        addedProperties.add('fontSize');
      } else {
        // Try to find a matching typography token
        const typographyToken = findToken(styles.fontSize, 'typography');
        if (typographyToken) {
          tailwindClasses.push(`text-${typographyToken}`);
          addedProperties.add('fontSize');
        } else {
          tailwindClasses.push(`text-[${styles.fontSize}]`);
          addedProperties.add('fontSize');
        }
      }
    }
    
    // Add other font-related properties
    if (styles.fontWeight && !addedProperties.has('fontWeight')) {
      // Map font weight to Tailwind's font-weight classes
      const weightMap: Record<string, string> = {
        '100': 'font-thin',
        '200': 'font-extralight',
        '300': 'font-light',
        '400': 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        '800': 'font-extrabold',
        '900': 'font-black',
      };
      
      if (weightMap[styles.fontWeight]) {
        tailwindClasses.push(weightMap[styles.fontWeight]);
        addedProperties.add('fontWeight');
      } else {
        tailwindClasses.push(`font-[${styles.fontWeight}]`);
        addedProperties.add('fontWeight');
      }
    }
  }
  
  // Handle layout properties
  if (styles.width) {
    if (styles.width === '100%') {
      tailwindClasses.push('w-full');
    } else {
      // Try to find a matching spacing token
      const spacingToken = findToken(styles.width, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`w-${spacingToken}`);
      } else {
        tailwindClasses.push(`w-[${styles.width}]`);
      }
    }
  }
  
  // Handle border properties
  if (styles.strokeWeight && !addedProperties.has('border')) {
    // Extract the border width value
    const borderMatch = styles.strokeWeight.match(/(\d+)px/);
    if (borderMatch) {
      const borderWidth = parseInt(borderMatch[1]);
      // Add the appropriate Tailwind border class
      if (borderWidth === 1) {
        tailwindClasses.push('border');
      } else if (borderWidth > 0) {
        tailwindClasses.push(`border-${borderWidth}`);
      }
      
      // If we have a border property with color information
      if (styles.border) {
        // Try to extract color information
        const colorMatch = styles.border.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
        if (colorMatch) {
          const colorValue = colorMatch[0];
          
          // First try to find a token match - prioritize custom tokens
          const colorToken = findToken(colorValue, 'colors');
          
          if (colorToken) {
            // Use the custom token
            tailwindClasses.push(`border-${colorToken}`);
          } else {
            // If no token match, standardize to RGB/RGBA and try Tailwind matching
            const standardizedColor = getRgba(colorValue) || colorValue;
            const tailwindMatch = matchToTailwindColor(standardizedColor);
            
            if (tailwindMatch) {
              // Use Tailwind color
              let colorClass = '';
              if (tailwindMatch.shade) {
                colorClass = `border-${tailwindMatch.name}-${tailwindMatch.shade}`;
              } else {
                colorClass = `border-${tailwindMatch.name}`;
              }
              
              // Add opacity modifier if needed
              if (tailwindMatch.opacity !== undefined) {
                const opacityValue = Math.round(tailwindMatch.opacity * 100);
                colorClass += `/${opacityValue}`;
              }
              
              tailwindClasses.push(colorClass);
            } else {
              // Last resort: arbitrary value - use standardized color if available
              tailwindClasses.push(`border-[${standardizedColor}]`);
            }
          }
        }
      }
      
      // Handle border style (solid, dashed, dotted)
      if (styles.borderStyle) {
        switch (styles.borderStyle) {
          case 'solid':
            // 'solid' is the default, so no class needed
            break;
          case 'dashed':
            tailwindClasses.push('border-dashed');
            break;
          case 'dotted':
            tailwindClasses.push('border-dotted');
            break;
        }
      }
      
      addedProperties.add('border');
    }
  }
  
  // Handle border radius
  if (styles.borderRadius && !addedProperties.has('borderRadius')) {
    // Try to find a matching border radius token
    const radiusToken = findToken(styles.borderRadius, 'borderRadius');
    if (radiusToken) {
      tailwindClasses.push(`rounded-${radiusToken}`);
      addedProperties.add('borderRadius');
    } else {
      // Check if it's a px value
      const radiusMatch = styles.borderRadius.match(/(\d+)px/);
      if (radiusMatch) {
        const radiusValue = parseInt(radiusMatch[1]);
        // Only add border radius class if it's greater than 0
        if (radiusValue > 0) {
          if (radiusValue <= 2) {
            tailwindClasses.push('rounded-sm');
          } else if (radiusValue <= 4) {
            tailwindClasses.push('rounded');
          } else if (radiusValue <= 6) {
            tailwindClasses.push('rounded-md');
          } else if (radiusValue <= 8) {
            tailwindClasses.push('rounded-lg');
          } else if (radiusValue <= 12) {
            tailwindClasses.push('rounded-xl');
          } else if (radiusValue <= 16) {
            tailwindClasses.push('rounded-2xl');
          } else if (radiusValue <= 24) {
            tailwindClasses.push('rounded-3xl');
          } else {
            tailwindClasses.push('rounded-full');
          }
          addedProperties.add('borderRadius');
        }
      } else if (styles.borderRadius.includes(' ')) {
        // Handle individual corner radii in the format "10px 20px 30px 40px"
        // Only add if at least one value is non-zero
        const values = styles.borderRadius.split(' ').map(v => parseInt(v));
        if (values.some(v => v > 0)) {
          tailwindClasses.push(`rounded-[${styles.borderRadius}]`);
          addedProperties.add('borderRadius');
        }
      } else if (styles.borderRadius !== '0' && styles.borderRadius !== '0px') {
        tailwindClasses.push(`rounded-[${styles.borderRadius}]`);
        addedProperties.add('borderRadius');
      }
    }
  }
  
  // Handle position
  if (styles.position && !addedProperties.has('position')) {
    // Map position values directly to Tailwind classes
    const positionMap: Record<string, string> = {
      'absolute': 'absolute',
      'relative': 'relative',
      'fixed': 'fixed',
      'sticky': 'sticky',
      'static': 'static'
    };
    
    if (positionMap[styles.position]) {
      tailwindClasses.push(positionMap[styles.position]);
      addedProperties.add('position');
    }
    
    // Handle positioning values (top, right, bottom, left)
    for (const prop of ['top', 'right', 'bottom', 'left'] as const) {
      if (styles[prop]) {
        const value = styles[prop]!;
        if (value === '0' || value === '0px') {
          tailwindClasses.push(`${prop}-0`);
        } else {
          // Try to match to spacing tokens or use arbitrary value
          const spacingToken = findToken(value, 'spacing');
          if (spacingToken) {
            tailwindClasses.push(`${prop}-${spacingToken}`);
          } else {
            // Check if it's a pixel value
            const pixelMatch = value.match(/(\d+)px/);
            if (pixelMatch) {
              const pixelValue = parseInt(pixelMatch[1]);
              tailwindClasses.push(`${prop}-${pxToTailwindSpacing(pixelValue.toString())}`);
            } else {
              tailwindClasses.push(`${prop}-[${value}]`);
            }
          }
        }
      }
    }
  }
  
  // Handle margin
  if (styles.margin && !addedProperties.has('margin')) {
    // Try to find a matching spacing token
    const spacingToken = findToken(styles.margin, 'spacing');
    if (spacingToken) {
      tailwindClasses.push(`m-${spacingToken}`);
      addedProperties.add('margin');
    } else {
      // Check if it's a shorthand value
      const parsedMargin = parseSpacingShorthand(styles.margin);
      if (parsedMargin) {
        // If all sides are equal, use a single margin class
        if (parsedMargin.top === parsedMargin.right && 
            parsedMargin.right === parsedMargin.bottom && 
            parsedMargin.bottom === parsedMargin.left) {
          tailwindClasses.push(`m-${pxToTailwindSpacing(parsedMargin.top)}`);
        } else {
          // Otherwise, use individual margin classes
          tailwindClasses.push(`mt-${pxToTailwindSpacing(parsedMargin.top)}`);
          tailwindClasses.push(`mr-${pxToTailwindSpacing(parsedMargin.right)}`);
          tailwindClasses.push(`mb-${pxToTailwindSpacing(parsedMargin.bottom)}`);
          tailwindClasses.push(`ml-${pxToTailwindSpacing(parsedMargin.left)}`);
        }
        addedProperties.add('margin');
      }
    }
  }
  
  // Handle individual margin properties
  for (const [prop, tailwindPrefix] of [
    ['marginTop', 'mt'],
    ['marginRight', 'mr'],
    ['marginBottom', 'mb'],
    ['marginLeft', 'ml']
  ] as const) {
    if (styles[prop] && !addedProperties.has(prop)) {
      // Try to find a matching spacing token
      const spacingToken = findToken(styles[prop], 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`${tailwindPrefix}-${spacingToken}`);
      } else {
        // Check if it's a px value
        const marginMatch = styles[prop].match(/(\d+)px/);
        if (marginMatch) {
          const marginValue = parseInt(marginMatch[1]);
          tailwindClasses.push(`${tailwindPrefix}-${pxToTailwindSpacing(marginValue.toString())}`);
        } else {
          tailwindClasses.push(`${tailwindPrefix}-[${styles[prop]}]`);
        }
      }
      addedProperties.add(prop);
    }
  }
  
  // Handle aspect ratio
  if (styles.targetAspectRatio && !addedProperties.has('aspectRatio')) {
    const ratio = styles.targetAspectRatio;
    // Handle common aspect ratios
    if (Math.abs(ratio - 1) < 0.01) {
      tailwindClasses.push('aspect-square');
    } else if (Math.abs(ratio - 16/9) < 0.01) {
      tailwindClasses.push('aspect-video');
    } else {
      // Use custom aspect ratio
      tailwindClasses.push(`aspect-[${ratio.toFixed(2)}]`);
    }
    addedProperties.add('aspectRatio');
  }
  
  // Handle individual corner radii
  if (!addedProperties.has('borderRadius')) {
    const hasIndividualRadii = styles.topLeftRadius || styles.topRightRadius || 
                              styles.bottomLeftRadius || styles.bottomRightRadius;
    
    if (hasIndividualRadii) {
      if (styles.topLeftRadius) {
        const radiusMatch = styles.topLeftRadius.match(/(\d+)px/);
        if (radiusMatch) {
          const radiusValue = parseInt(radiusMatch[1]);
          if (radiusValue > 0) {
            const radius = mapRadiusToTailwind(radiusValue);
            if (radius) {
              tailwindClasses.push(`rounded-tl-${radius}`);
            }
          }
        }
      }
      
      if (styles.topRightRadius) {
        const radiusMatch = styles.topRightRadius.match(/(\d+)px/);
        if (radiusMatch) {
          const radiusValue = parseInt(radiusMatch[1]);
          if (radiusValue > 0) {
            const radius = mapRadiusToTailwind(radiusValue);
            if (radius) {
              tailwindClasses.push(`rounded-tr-${radius}`);
            }
          }
        }
      }
      
      if (styles.bottomLeftRadius) {
        const radiusMatch = styles.bottomLeftRadius.match(/(\d+)px/);
        if (radiusMatch) {
          const radiusValue = parseInt(radiusMatch[1]);
          if (radiusValue > 0) {
            const radius = mapRadiusToTailwind(radiusValue);
            if (radius) {
              tailwindClasses.push(`rounded-bl-${radius}`);
            }
          }
        }
      }
      
      if (styles.bottomRightRadius) {
        const radiusMatch = styles.bottomRightRadius.match(/(\d+)px/);
        if (radiusMatch) {
          const radiusValue = parseInt(radiusMatch[1]);
          if (radiusValue > 0) {
            const radius = mapRadiusToTailwind(radiusValue);
            if (radius) {
              tailwindClasses.push(`rounded-br-${radius}`);
            }
          }
        }
      }
      
      if (tailwindClasses.some(cls => cls.startsWith('rounded-'))) {
        addedProperties.add('borderRadius');
      }
    }
  }
  
  if (styles.height) {
    // Only preserve specific height values that make sense for web layouts
    if (styles.height === '100%') {
      tailwindClasses.push('h-full');
    } else if (styles.position === 'absolute') {
      // For absolutely positioned elements, we should preserve the exact height
      const spacingToken = findToken(styles.height, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`h-${spacingToken}`);
      } else {
        tailwindClasses.push(`h-[${styles.height}]`);
      }
    } else if (styles.layoutSizingVertical === 'FIXED') {
      // For elements explicitly set to have fixed height
      const spacingToken = findToken(styles.height, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`h-${spacingToken}`);
      } else {
        tailwindClasses.push(`h-[${styles.height}]`);
      }
    }
    // For all other elements, we allow them to size naturally (no height class)
    // This makes the layout more responsive by default
  }
  
  if (styles.display) {
    tailwindClasses.push(styles.display === 'flex' ? 'flex' : 'block');
  }
  
  if (styles.flexDirection) {
    tailwindClasses.push(styles.flexDirection === 'row' ? 'flex-row' : 'flex-col');
  }
  
  if (styles.justifyContent) {
    const normalizedValue = normalizeFlexValue('justifyContent', styles.justifyContent);
    tailwindClasses.push(`justify-${normalizedValue}`);
  }
  
  if (styles.alignItems) {
    const normalizedValue = normalizeFlexValue('alignItems', styles.alignItems);
    tailwindClasses.push(`items-${normalizedValue}`);
  }
  
  if (styles.alignSelf) {
    const normalizedValue = normalizeFlexValue('alignSelf', styles.alignSelf);
    tailwindClasses.push(`self-${normalizedValue}`);
  }
  
  if (styles.flexGrow) {
    const grow = parseInt(styles.flexGrow);
    if (grow === 1) {
      tailwindClasses.push('grow');
    } else if (grow === 0) {
      tailwindClasses.push('grow-0');
    } else {
      tailwindClasses.push(`grow-[${grow}]`);
    }
  }
  
  if (styles.overflow) {
    tailwindClasses.push(`overflow-${styles.overflow}`);
  }
  
  if (styles.gap) {
    // Try to find a matching spacing token
    const spacingToken = findToken(styles.gap, 'spacing');
    if (spacingToken) {
      tailwindClasses.push(`gap-${spacingToken}`);
    } else {
      // Check if it's a px value
      const gapMatch = styles.gap.match(/(\d+)px/);
      if (gapMatch) {
        const gapValue = parseInt(gapMatch[1]);
        tailwindClasses.push(`gap-${pxToTailwindSpacing(gapValue.toString())}`);
      } else {
        tailwindClasses.push(`gap-[${styles.gap}]`);
      }
    }
  }
  
  if (styles.padding) {
    // Try to find a matching spacing token
    const spacingToken = findToken(styles.padding, 'spacing');
    if (spacingToken) {
      tailwindClasses.push(`p-${spacingToken}`);
    } else {
      // Check if it's a shorthand value
      const parsedPadding = parseSpacingShorthand(styles.padding);
      if (parsedPadding) {
        // If all sides are equal, use a single padding class
        if (parsedPadding.top === parsedPadding.right && 
            parsedPadding.right === parsedPadding.bottom && 
            parsedPadding.bottom === parsedPadding.left) {
          tailwindClasses.push(`p-${pxToTailwindSpacing(parsedPadding.top)}`);
        } else {
          // Otherwise, use individual padding classes
          tailwindClasses.push(`pt-${pxToTailwindSpacing(parsedPadding.top)}`);
          tailwindClasses.push(`pr-${pxToTailwindSpacing(parsedPadding.right)}`);
          tailwindClasses.push(`pb-${pxToTailwindSpacing(parsedPadding.bottom)}`);
          tailwindClasses.push(`pl-${pxToTailwindSpacing(parsedPadding.left)}`);
        }
      }
    }
  }
  
  // Remove any duplicate or conflicting classes (like multiple bg-* classes)
  const uniqueClasses = removeDuplicateAndConflictingClasses(tailwindClasses);
  
  return uniqueClasses.join(' ');
}

// Helper function to remove duplicate and conflicting classes
function removeDuplicateAndConflictingClasses(classes: string[]): string[] {
  const result: string[] = [];
  const addedPrefixes = new Set<string>();
  
  // Define prefixes that should be unique (can't have multiple of these)
  const uniquePrefixes = [
    'bg-', 'text-', 'w-', 'h-', 'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
    'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-', 'rounded-', 'border-', 'flex-'
  ];

  // First, filter out all bg-white, bg-gray-* etc. that might have been added accidentally
  const noDefaultBackgrounds = classes.filter(cls => {
    // If this is a specific background color, check if it was explicitly added with addProperties
    // This is to avoid default "bg-white" being added to every element
    if (cls === 'bg-white' || cls.startsWith('bg-gray-') || 
        cls.startsWith('bg-primary-') || cls.startsWith('bg-secondary-') ||
        cls.startsWith('bg-red-') || cls.startsWith('bg-green-')) {
      // Keep only if it was explicitly added to the element
      return true; // We'll check for duplicates in the next step
    }
    return true;
  });
  
  // Then handle any remaining classes
  noDefaultBackgrounds.forEach(cls => {
    // Check if this class conflicts with any we've already added
    const prefix = uniquePrefixes.find(p => cls.startsWith(p));
    
    if (prefix) {
      // This is a class that should be unique
      if (!addedPrefixes.has(prefix)) {
        // We haven't added this type of class yet, so add it
        result.push(cls);
        addedPrefixes.add(prefix);
      }
      // Otherwise, we've already added this type of class, so skip it
    } else {
      // This is not a class that needs to be unique, so just add it
      result.push(cls);
    }
  });
  
  return result;
}