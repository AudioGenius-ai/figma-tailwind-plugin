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


const getRgba = (value: string) => {
  try {
    const rgba = figma.util.rgba(value);
    if (rgba.a !== 1) {
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
  } else {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }
  } catch (error) {
    console.error('Error extracting RGBA values:', error);
    return null;
  }
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
  
  // Try to find a direct match in the design tokens
  for (const [tokenName, tokenData] of Object.entries(tokens[tokenType])) {
    const tokenNameNormalized = styleNameToVariable(tokenName);
    
    // For colors, check if the value matches the token name or is close to the hex value
    if (tokenType === 'colors') {
      const tokenValue = (tokenData as ColorToken).value as string;
      const tokenValueLower = tokenValue.toLowerCase();

      // Check for exact name match
      if (normalizedValue === tokenNameNormalized) {
        return tokenNameNormalized;
      }
      
      // Check for name with spaces replaced by dashes
      if (normalizedValue.replace(/\s+/g, '-') === tokenNameNormalized) {
        return tokenNameNormalized;
      }
      
      // Check if the color value contains the token value (for hex codes)
      if (tokenValueLower && getRgba(tokenValueLower) === getRgba(normalizedValue)) {
        return tokenNameNormalized;
      }
      
      // Handle RGB/RGBA format
      if (normalizedValue.startsWith('rgb')) {
        // Extract RGB values for comparison
        const rgbMatch = normalizedValue.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbMatch) {
          const [_, r, g, b] = rgbMatch;
          // Create a simplified RGB string for comparison
          const simplifiedRgb = `rgb(${r},${g},${b})`.toLowerCase();
          
          // Check if token value contains this RGB pattern
          if (tokenValueLower.includes(simplifiedRgb) || 
              tokenValueLower.includes(`${r}, ${g}, ${b}`)) {
            return tokenNameNormalized;
          }
        }
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
  
  // Fall back to raw values for properties that don't have style/variable references
  // Only add background color if it was explicitly specified and we haven't already handled it
  if (!addedProperties.has('backgroundColor') && shouldAddBackgroundColor && styles.backgroundColor) {
    // Check for transparent background
    if (styles.backgroundColor === 'transparent') {
      tailwindClasses.push('bg-transparent');
      addedProperties.add('backgroundColor');
    } else {
      // Try to find a matching color token
      const colorValue = extractColorValue(styles.backgroundColor);
      const colorToken = colorValue ? findToken(styles.backgroundColor, 'colors') : null;
      
      if (colorToken) {
        tailwindClasses.push(`bg-${colorToken}`);
        addedProperties.add('backgroundColor');
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
      const colorToken = colorValue ? findToken(styles.color, 'colors') : null;
      
      if (colorToken) {
        tailwindClasses.push(`text-${colorToken}`);
        addedProperties.add('color');
      } else {
        const colorToken = findToken(styles.color, 'colors');
        if (colorToken) {
          tailwindClasses.push(`text-${colorToken}`);
          addedProperties.add('color');
        } else {
          tailwindClasses.push(`text-[${styles.color}]`);
          addedProperties.add('color');
        }
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