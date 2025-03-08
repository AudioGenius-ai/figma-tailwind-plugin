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
function findMatchingColor(color: string, tokens: DesignTokens): string | null {
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

export function stylesToTailwind(styles: StyleProperties, tokens: DesignTokens): string {
  const tailwindClasses: string[] = [];
  // Track which properties we've already added to avoid duplicates
  const addedProperties = new Set<string>();
  console.log('styles', styles, tokens);
  // Helper function to find matching token
  const findMatchingToken = (value: string, tokenType: 'colors' | 'typography' | 'spacing' | 'effects'): string | null => {
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
        if (tokenValueLower && normalizedValue.includes(tokenValueLower)) {
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
  };
  
  // Handle style references first
  if (styles.styleReferences) {
    // Fill styles (background colors)
    if (styles.styleReferences.fill) {
      const tokenName = styleNameToVariable(styles.styleReferences.fill);
      
      // Check if this is actually a text color token by looking at naming patterns
      const isTextToken = tokenName.includes('text-') || 
                          styles.styleReferences.fill.includes('text') ||
                          (styles.color && !styles.backgroundColor); // If it has color but no background, likely text
                          
      if (tokens.colors[tokenName] || tokens.colors[styles.styleReferences.fill]) {
        if (isTextToken) {
          // Use text- prefix for text color tokens
          tailwindClasses.push(`text-${tokenName.replace('text-', '')}`);
        } else {
          // Use bg- prefix for background color tokens
          tailwindClasses.push(`bg-${tokenName}`);
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
        } else {
          // Use bg- prefix for background color tokens
          tailwindClasses.push(`bg-${tokenName}`);
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
  if (!styles.styleReferences?.fill && styles.backgroundColor && !addedProperties.has('backgroundColor')) {
    // Try to find a matching color token
    const colorValue = extractColorValue(styles.backgroundColor);
    const colorToken = colorValue ? findMatchingColor(colorValue, tokens) : null;
    
    if (colorToken) {
      tailwindClasses.push(`bg-${colorToken}`);
      addedProperties.add('backgroundColor');
    } else {
      const colorToken = findMatchingToken(styles.backgroundColor, 'colors');
      if (colorToken) {
        tailwindClasses.push(`bg-${colorToken}`);
        addedProperties.add('backgroundColor');
      } else {
        tailwindClasses.push(`bg-[${styles.backgroundColor}]`);
        addedProperties.add('backgroundColor');
      }
    }
  }
  
  if (!styles.styleReferences?.text) {
    if (styles.color && !addedProperties.has('color')) {
      // Try to find a matching color token for text color
      const colorValue = extractColorValue(styles.color);
      const colorToken = colorValue ? findMatchingColor(colorValue, tokens) : null;
      
      if (colorToken) {
        tailwindClasses.push(`text-${colorToken}`);
        addedProperties.add('color');
      } else {
        const colorToken = findMatchingToken(styles.color, 'colors');
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
        const typographyToken = findMatchingToken(styles.fontSize, 'typography');
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
      const spacingToken = findMatchingToken(styles.width, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`w-${spacingToken}`);
      } else {
        tailwindClasses.push(`w-[${styles.width}]`);
      }
    }
  }
  
  if (styles.height) {
    if (styles.height === '100%') {
      tailwindClasses.push('h-full');
    } else {
      // Try to find a matching spacing token
      const spacingToken = findMatchingToken(styles.height, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`h-${spacingToken}`);
      } else {
        tailwindClasses.push(`h-[${styles.height}]`);
      }
    }
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
    const spacingToken = findMatchingToken(styles.gap, 'spacing');
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
    const spacingToken = findMatchingToken(styles.padding, 'spacing');
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
      } else {
        tailwindClasses.push(`p-[${styles.padding}]`);
      }
    }
  }
  
  if (styles.margin) {
    // Try to find a matching spacing token
    const spacingToken = findMatchingToken(styles.margin, 'spacing');
    if (spacingToken) {
      tailwindClasses.push(`m-${spacingToken}`);
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
      } else {
        tailwindClasses.push(`m-[${styles.margin}]`);
      }
    }
  }
  
  if (styles.position) {
    tailwindClasses.push(styles.position);
  }
  
  // Handle list spacing if applicable
  if (styles.listSpacing) {
    // Skip adding space-y class if spacing is 0px
    if (styles.listSpacing === '0px' || styles.listSpacing === '0') {
      // Don't add space-y-[0px] as it's redundant
    } else {
      // Try to find a matching spacing token
      const spacingToken = findMatchingToken(styles.listSpacing, 'spacing');
      if (spacingToken) {
        tailwindClasses.push(`space-y-${spacingToken}`);
      } else {
        tailwindClasses.push(`space-y-[${styles.listSpacing}]`);
      }
    }
  }
  
  // Handle leading trim
  if (styles.leadingTrim) {
    tailwindClasses.push(`leading-trim-${styles.leadingTrim}`);
  }
  
  // Handle hanging list (requires custom Tailwind plugin/config)
  if (styles.hangingList) {
    tailwindClasses.push('hanging-list');
  }
  
  // Handle OpenType features (requires custom Tailwind plugin/config)
  if (styles.openTypeFeatures) {
    Object.entries(styles.openTypeFeatures).forEach(([feature, enabled]) => {
      if (enabled) {
        tailwindClasses.push(`font-feature-${feature}`);
      }
    });
  }
  
  // Handle other properties
  if (styles.borderRadius) {
    // Check if it's a named radius like 'rounded-2xl'
    if (styles.borderRadius.includes('xl') || styles.borderRadius.includes('2xl') || 
        styles.borderRadius.includes('3xl') || styles.borderRadius.includes('full')) {
      tailwindClasses.push(`rounded-${styles.borderRadius}`);
    } else {
      // Try to parse as a number
      const radiusMatch = styles.borderRadius.match(/(\d+)px/);
      if (radiusMatch) {
        const radius = parseInt(radiusMatch[1]);
        
        if (radius === 0) {
          tailwindClasses.push('rounded-none');
        } else if (radius === 9999 || radius >= 9999) {
          tailwindClasses.push('rounded-full');
        } else {
          // Map common pixel values to Tailwind rounded classes
          const roundedMap: Record<number, string> = {
            2: 'sm',
            4: 'md',
            6: 'lg',
            8: 'xl',
            12: '2xl',
            16: '3xl',
            24: '4xl',
            32: '5xl'
          };
          
          // Find the closest standard size
          const standardSizes = Object.keys(roundedMap).map(Number);
          const closestSize = standardSizes.reduce((prev, curr) => 
            Math.abs(curr - radius) < Math.abs(prev - radius) ? curr : prev
          );
          
          // Use the standard class if it's close enough, otherwise use arbitrary value
          if (Math.abs(closestSize - radius) <= 2) {
            tailwindClasses.push(`rounded-${roundedMap[closestSize]}`);
          } else {
            tailwindClasses.push(`rounded-[${radius}px]`);
          }
        }
      } else {
        tailwindClasses.push(`rounded-[${styles.borderRadius}]`);
      }
    }
  }
  
  if (!styles.styleReferences?.effect && styles.boxShadow) {
    // Try to find a matching effect token
    const effectToken = findMatchingToken(styles.boxShadow, 'effects');
    if (effectToken) {
      tailwindClasses.push(`shadow-${effectToken}`);
    } else {
      tailwindClasses.push(`shadow-[${styles.boxShadow}]`);
    }
  }
  
  if (!styles.styleReferences?.stroke && styles.border) {
    // Try to find a matching color token for border
    const colorToken = findMatchingToken(styles.border, 'colors');
    if (colorToken) {
      tailwindClasses.push(`border-${colorToken}`);
    } else {
      tailwindClasses.push(`border-[${styles.border}]`);
    }
  }
  
  if (styles.opacity) {
    // Try to parse the opacity value
    let opacityValue: number;
    
    if (typeof styles.opacity === 'number') {
      opacityValue = styles.opacity;
    } else if (typeof styles.opacity === 'string') {
      // Handle percentage format (e.g., "50%")
      if (styles.opacity.endsWith('%')) {
        opacityValue = parseFloat(styles.opacity) / 100;
      } else {
        // Handle decimal format (e.g., "0.5")
        opacityValue = parseFloat(styles.opacity);
      }
    } else {
      opacityValue = 1; // Default to fully opaque
    }
    
    // Convert to percentage for Tailwind (0-100)
    const opacityPercentage = Math.round(opacityValue * 100);
    
    // Map to Tailwind's opacity scale
    if (opacityPercentage === 0) {
      tailwindClasses.push('opacity-0');
    } else if (opacityPercentage === 100) {
      tailwindClasses.push('opacity-100');
    } else if (opacityPercentage % 5 === 0 && opacityPercentage <= 100) {
      // Tailwind has opacity-5, opacity-10, opacity-20, etc.
      tailwindClasses.push(`opacity-${opacityPercentage}`);
    } else {
      // Use arbitrary value for non-standard opacities
      tailwindClasses.push(`opacity-[${opacityValue}]`);
    }
  }
  
  // Handle aspect ratio
  if (styles.targetAspectRatio) {
    // Use Tailwind's aspect ratio classes if it's a common ratio
    if (Math.abs(styles.targetAspectRatio - 1) < 0.01) {
      tailwindClasses.push('aspect-square');
    } else if (Math.abs(styles.targetAspectRatio - (16/9)) < 0.01) {
      tailwindClasses.push('aspect-video');
    } else {
      // Use arbitrary value for custom aspect ratios
      const ratio = Math.round(styles.targetAspectRatio * 100) / 100; // Round to 2 decimal places
      tailwindClasses.push(`aspect-[${ratio}]`);
    }
  }
  
  return tailwindClasses.join(' ');
} 