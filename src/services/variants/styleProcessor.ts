/**
 * @file styleProcessor.ts
 * This file contains functions for processing and extracting styles from Figma nodes,
 * converting them to Tailwind classes, and handling style variants.
 */

import { DesignTokens, ColorToken } from '../../types/designTokenTypes';
import { 
  stylesToTailwind as convertStylesToTailwind, 
  findMatchingColor,
  findMatchingToken
} from '../../transformers/stylesToTailwind';
import { cleanupTailwindClasses } from '../utils/styleUtils';
import { VariantStyleMap } from './componentStructure';

/**
 * Process styles to ensure correct color handling for variables
 */
export function processStyles(styles: any, tokens: DesignTokens): any {
  // Make a copy of the styles to avoid modifying the original
  const processedStyles = { ...styles };
  
  // Handle background images
  if (styles.backgroundImage) {
    processedStyles.backgroundImage = styles.backgroundImage;
    
    if (styles.backgroundImageHash) {
      processedStyles.backgroundImageHash = styles.backgroundImageHash;
    }
    
    if (styles.backgroundSize) {
      processedStyles.backgroundSize = styles.backgroundSize;
    }
    
    if (styles.backgroundPosition) {
      processedStyles.backgroundPosition = styles.backgroundPosition;
    }
    
    if (styles.backgroundRepeat) {
      processedStyles.backgroundRepeat = styles.backgroundRepeat;
    }
  }
  
  // Handle variable references
  if (styles.variableReferences) {
    // Process each variable reference by looking it up in the tokens
    for (const [varName, varReference] of Object.entries(styles.variableReferences)) {
      // Skip if the value isn't meaningful
      if (!varReference) continue;
      
      const referenceStr = String(varReference);
      
      // Extract the variable collection and name
      // Format is typically "Variable collection/variable-name"
      const parts = referenceStr.split('/');
      const variableName = parts.length > 1 ? parts[1] : referenceStr;
      
      // Look for the token in the color tokens
      if (tokens.colors) {
        for (const [tokenName, tokenValue] of Object.entries(tokens.colors)) {
          // Check if the token name matches the variable name (case-insensitive)
          if (tokenName.toLowerCase() === variableName.toLowerCase() ||
              tokenName.toLowerCase().replace(/-/g, '') === variableName.toLowerCase().replace(/-/g, '')) {
            
            // Determine if this is a background, text, or border color
            if (varName.includes('background') || varName.includes('bg-') || 
                varName.includes('/') && !varName.includes('text-')) {
              processedStyles.backgroundColor = `bg-${tokenName}`;
            } else if (varName.includes('text-') || varName.includes('color-')) {
              processedStyles.color = `text-${tokenName}`;
            } else if (varName.includes('border-')) {
              processedStyles.borderColor = `border-${tokenName}`;
            }
            break;
          }
        }
      }
    }
    
    // If we still haven't found a match, use the direct variable names
    if (!processedStyles.backgroundColor && styles.variableReferences) {
      // Check for background color variables
      const bgVariables = Object.keys(styles.variableReferences).filter(key => 
        key.includes('background') || 
        key.includes('bg-') || 
        (key.includes('/') && !key.includes('text-'))
      );
      
      // Process background variables
      if (bgVariables.length > 0) {
        // Use the first background variable we find
        const bgVar = bgVariables[0];
        
        // Try to construct a tailwind class from the variable
        const tokenName = bgVar.replace('background-', '').replace('bg-', '');
        
        // If it's a pattern like "gray/100", parse it properly
        if (bgVar.includes('/')) {
          const parts = bgVar.split('/');
          if (parts.length >= 2) {
            const colorName = parts[0].toLowerCase();
            const shade = parts[1].replace(/\D/g, '');
            processedStyles.backgroundColor = `bg-${colorName}-${shade}`;
          } else {
            processedStyles.backgroundColor = `bg-${tokenName}`;
          }
        } else {
          processedStyles.backgroundColor = `bg-${tokenName}`;
        }
      }
    }
  }
  
  // If we have a raw background color but no tailwind class yet
  if (styles.backgroundColor && (!processedStyles.backgroundColor || !processedStyles.backgroundColor.startsWith('bg-'))) {
    // Try to match the hex color to a token
    const hexColor = styles.backgroundColor.toLowerCase();
    
    let foundToken = false;
    
    // Look for the hex color in the color tokens
    if (tokens.colors) {
      for (const [tokenName, tokenValue] of Object.entries(tokens.colors)) {
        const tokenColor = typeof tokenValue === 'object' && tokenValue.value ? 
          String(tokenValue.value).toLowerCase() : '';
        
        // Check for direct hex match
        if (tokenColor === hexColor) {
          processedStyles.backgroundColor = `bg-${tokenName}`;
          foundToken = true;
          break;
        }
      }
    }
  }
  
  return processedStyles;
}

/**
 * Extract common classes from variant styles
 */
export function extractCommonClassesFromStyles(styles: VariantStyleMap): string {
  // Get all tailwind classes from all variants
  const allStyles = Object.values(styles).map(style => style.tailwindClasses);
  
  if (allStyles.length === 0) return '';
  
  // If only one variant, return its classes
  if (allStyles.length === 1) return allStyles[0];
  
  // Find classes that appear in all variants
  const firstStyleClasses = allStyles[0].split(' ').filter(Boolean);
  const commonClasses = firstStyleClasses.filter((cls: string) => 
    allStyles.every(style => style.includes(cls))
  );
  
  return commonClasses.join(' ');
}

/**
 * Extract base styles that should apply to base component
 * and eliminate any contradictory classes
 */
export function extractBaseStyles(baseClassNames: string): string {
  // Split classes into array
  const classes = baseClassNames.split(' ').filter(Boolean);
  
  // Create a map of class types to detect conflicts
  const classGroups: Record<string, Set<string>> = {
    background: new Set(),  // bg-*
    text: new Set(),        // text-*
    border: new Set(),      // border-*
    padding: new Set(),     // p*, pt-*, pr-*, etc.
    margin: new Set(),      // m*, mt-*, mr-*, etc.
    width: new Set(),       // w-*
    height: new Set(),      // h-*
    flex: new Set(),        // flex-*
    position: new Set(),    // static, relative, absolute, etc.
    display: new Set(),     // block, flex, grid, etc.
    rounded: new Set(),     // rounded-*
    shadow: new Set(),      // shadow-*
    other: new Set()        // All other classes
  };
  
  // Classify each class into its appropriate group
  classes.forEach(cls => {
    // Skip any class that uses custom values with [] as they're better handled in variants
    if (cls.includes('[') && cls.includes(']')) {
      return;
    }
    
    if (/^bg-/.test(cls)) {
      classGroups.background.add(cls);
    } else if (/^text-/.test(cls)) {
      classGroups.text.add(cls);
    } else if (/^border-/.test(cls)) {
      classGroups.border.add(cls);
    } else if (/^(p|px-|py-|pt-|pr-|pb-|pl-)/.test(cls)) {
      classGroups.padding.add(cls);
    } else if (/^(m|mx-|my-|mt-|mr-|mb-|ml-)/.test(cls)) {
      classGroups.margin.add(cls);
    } else if (/^w-/.test(cls)) {
      classGroups.width.add(cls);
    } else if (/^h-/.test(cls)) {
      classGroups.height.add(cls);
    } else if (/^flex-/.test(cls) || cls === 'flex') {
      classGroups.flex.add(cls);
    } else if (/^(static|relative|absolute|fixed|sticky)$/.test(cls)) {
      classGroups.position.add(cls);
    } else if (/^(block|inline|inline-block|flex|grid|table|hidden)$/.test(cls)) {
      classGroups.display.add(cls);
    } else if (/^rounded-/.test(cls)) {
      classGroups.rounded.add(cls);
    } else if (/^shadow-/.test(cls)) {
      classGroups.shadow.add(cls);
    } else {
      classGroups.other.add(cls);
    }
  });
  
  // Select classes for base component
  const selectedClasses: string[] = [];
  
  // For groups that should be handled differently based on number of values
  const conflictingGroups = [
    'background', 'text', 'border', 'rounded', 'shadow', 'width', 'height', 
    'position', 'display'
  ];
  
  conflictingGroups.forEach(group => {
    // If multiple options, don't include in base styles - they should be in variants
    if (classGroups[group].size > 1) {
      // Don't include in base styles
    } 
    // If exactly one, include it if it's truly common (not variant-specific)
    else if (classGroups[group].size === 1) {
      const cls = Array.from(classGroups[group])[0];
      
      // Skip classes with brackets as they're better in variants
      if (!cls.includes('[') && !cls.includes(']')) {
        selectedClasses.push(cls);
      }
    }
  });
  
  // For non-conflicting groups, we can include multiple classes
  const nonConflictingGroups = ['padding', 'margin', 'flex', 'other'];
  nonConflictingGroups.forEach(group => {
    classGroups[group].forEach(cls => {
      // Skip classes with brackets as they're better in variants
      if (!cls.includes('[') && !cls.includes(']')) {
        selectedClasses.push(cls);
      }
    });
  });
  
  return selectedClasses.join(' ');
}

/**
 * Extract variant-specific styles from all styles
 */
export function extractVariantStyles(
  styles: VariantStyleMap,
  allVariantProps: Record<string, string[]>,
  tokens: DesignTokens
): Record<string, Record<string, string>> {
  const variants: Record<string, Record<string, string>> = {};
  
  // Initialize variants object structure
  Object.keys(allVariantProps).forEach(propKey => {
    variants[propKey] = {};
    
    // Initialize with empty strings for each variant value
    allVariantProps[propKey].forEach(propValue => {
      variants[propKey][propValue] = '';
    });
  });
  
  // Get all variant keys as an array for easier processing
  const variantKeys = Object.keys(styles);
  if (variantKeys.length === 0) {
    console.log('No variant styles to extract');
    return variants;
  }
  
  console.log(`Extracting variant styles from ${variantKeys.length} variants`);
  
  // First, directly extract any styles found in the variants
  // This ensures we capture all styles explicitly defined
  variantKeys.forEach(variantKey => {
    // Parse the variant key (e.g., "type=primary:state=default")
    const variantObj: Record<string, string> = {};
    variantKey.split(':').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        variantObj[key.toLowerCase()] = value;
      }
    });
    
    // Extract styles for this variant
    const variantStyle = styles[variantKey];
    if (!variantStyle || !variantStyle.tailwindClasses) return;
    
    // Add these styles to each property in this variant
    Object.entries(variantObj).forEach(([propKey, propValue]) => {
      if (variants[propKey] && variants[propKey][propValue] !== undefined) {
        // Add the classes if they aren't already there
        const existingClasses = variants[propKey][propValue].split(' ').filter(Boolean);
        const newClasses = variantStyle.tailwindClasses.split(' ').filter(Boolean);
        
        // Combine classes, removing duplicates
        const combinedClasses = [...new Set([...existingClasses, ...newClasses])].join(' ');
        variants[propKey][propValue] = combinedClasses;
      }
    });
  });
  
  // For each variant property (e.g., "type", "state", "size")
  Object.entries(allVariantProps).forEach(([propKey, propValues]) => {
    // Group variant keys by their value for this property
    const variantsByValue: Record<string, string[]> = {};
    
    // Initialize with empty arrays
    propValues.forEach(value => {
      variantsByValue[value] = [];
    });
    
    // Group variant keys by their value for this property
    variantKeys.forEach(variantKey => {
      // Parse the variant key (e.g., "type=primary:state=default")
      const variantObj: Record<string, string> = {};
      variantKey.split(':').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          variantObj[key.toLowerCase()] = value;
        }
      });
        
      // Get the value for this property
      const value = variantObj[propKey.toLowerCase()];
      if (value && propValues.includes(value)) {
        variantsByValue[value].push(variantKey);
      }
    });
    
    // For each property value (e.g., "primary", "secondary" for "type")
    propValues.forEach(propValue => {
      // Skip if this property value already has styles
      if (variants[propKey][propValue].trim() !== '') {
        return;
      }
      
      // Get all variant keys for this value
      const variantKeysForValue = variantsByValue[propValue];
      
      // If no variants found for this value and we don't already have styles, use defaults as last resort
      if (variantKeysForValue.length === 0) {
        console.log(`No variants found for ${propKey}=${propValue}`);
        // Only add defaults if we have no existing styles
        if (variants[propKey][propValue].trim() === '') {
          // Add some default styles based on property type and value
          if (propKey.toLowerCase() === 'type' || propKey.toLowerCase() === 'variant') {
            // Provide default color styles for type variants
            const propIndex = propValues.indexOf(propValue);
            // Use colors that actually exist in the Tailwind config
            const colorOptions = ['gray', 'primary', 'secondary', 'red', 'green'];
            const colorIndex = propIndex % colorOptions.length;
            const colorName = colorOptions[colorIndex];
            // Use the 500 shade as the default
            variants[propKey][propValue] = `bg-${colorName}-500 text-white`;
          } else if (propKey.toLowerCase() === 'state') {
            // Provide default state styles
            if (propValue.toLowerCase().includes('disabled')) {
              variants[propKey][propValue] = 'opacity-50 cursor-not-allowed';
            } else if (propValue.toLowerCase().includes('hover')) {
              variants[propKey][propValue] = 'hover:opacity-80';
            } else if (propValue.toLowerCase().includes('active')) {
              variants[propKey][propValue] = 'active:opacity-90';
            }
          } else if (propKey.toLowerCase() === 'size') {
            // Provide default size styles
            const sizes = propValues;
            const propIndex = sizes.indexOf(propValue);
            const paddingValues = ['px-2 py-1', 'px-3 py-2', 'px-4 py-2', 'px-6 py-3'];
            const fontSizes = ['text-caption-regular', 'text-body-2-regular', 'text-body1-20-regular', 'text-body1-24-regular'];
            const idx = sizes.length > 1 ? 
              Math.floor((propIndex / (sizes.length - 1)) * (paddingValues.length - 1)) : 0;
            variants[propKey][propValue] = `${paddingValues[idx]} ${fontSizes[idx]}`;
          }
        }
        return;
      }
      
      // Get styles specific to this property value
      const valueSpecificClasses = new Set<string>();
      
      // Find classes that appear in ALL variants with this property value,
      // but DON'T appear in ALL variants with OTHER values of this property
      
      // 1. Find all unique classes across variants with this property value
      const allClassesForThisValue = new Set<string>();
      variantKeysForValue.forEach(variantKey => {
        const variantStyle = styles[variantKey];
        if (!variantStyle || !variantStyle.tailwindClasses) return;
        
        variantStyle.tailwindClasses.split(' ').filter(Boolean).forEach(cls => {
          allClassesForThisValue.add(cls);
        });
      });
      
      // 2. For each class, check if it appears in ALL variants with this property value
      allClassesForThisValue.forEach(cls => {
        // Don't exclude layout classes if they're part of the variant styles
        // but do exclude these common classes that shouldn't vary by variant
        if (['flex', 'grid', 'col', 'row', 'items-', 'justify-'].some(prefix => 
             cls.startsWith(prefix)) && 
             !['flex-col', 'flex-row'].some(specific => cls === specific)) {
          return;
        }
        
        // Special handling for background transparency
        if (cls === 'bg-transparent') {
          // Always keep transparent backgrounds in the variant styles
          valueSpecificClasses.add(cls);
          return;
        }
        
        // Check if this class appears in all variants with this property value
        const appearsInAllVariantsWithThisValue = variantKeysForValue.every(variantKey => {
          const variantStyle = styles[variantKey];
          return variantStyle && 
                 variantStyle.tailwindClasses && 
                 variantStyle.tailwindClasses.includes(cls);
        });
        
        if (!appearsInAllVariantsWithThisValue) return;
        
        // Check if this class appears in any variants with OTHER values of this property
        let appearsInOtherValues = false;
        
        // Check all other property values
        for (const otherValue of propValues) {
          if (otherValue === propValue) continue; // Skip current value
          
          // Get variant keys for other value
          const otherValueVariantKeys = variantsByValue[otherValue];
          if (!otherValueVariantKeys || otherValueVariantKeys.length === 0) continue;
          
          // Check if class appears in ANY variants with this other value
          const appearsInThisOtherValue = otherValueVariantKeys.some(variantKey => {
            const variantStyle = styles[variantKey];
            return variantStyle && 
                   variantStyle.tailwindClasses && 
                   variantStyle.tailwindClasses.includes(cls);
          });
          
          if (appearsInThisOtherValue) {
            appearsInOtherValues = true;
            break;
          }
        }
        
        // If this class appears in all variants with this property value
        // AND doesn't appear in any variants with other values, it's specific to this value
        if (!appearsInOtherValues) {
          valueSpecificClasses.add(cls);
        }
      });
      
      // Only update if we found specific classes
      if (valueSpecificClasses.size > 0) {
        // Save the extracted classes
        variants[propKey][propValue] = Array.from(valueSpecificClasses).join(' ');
      }
    });
  });
  
  // As an absolute last resort, provide defaults for completely empty values
  Object.entries(variants).forEach(([propKey, propValues]) => {
    Object.entries(propValues).forEach(([propValue, classes]) => {
      if (classes.trim() === '') {
        console.log(`Warning: No styles found for ${propKey}=${propValue}, using minimal defaults`);
        
        // Provide minimal defaults without overriding existing styles
        if (propKey.toLowerCase() === 'state' && propValue.toLowerCase().includes('disabled')) {
          variants[propKey][propValue] = 'opacity-50 cursor-not-allowed';
        }
      }
    });
  });
  
  return variants;
}

/**
 * Extract meaningful styles for variants, focusing on visual properties
 */
export function extractMeaningfulStyles(allStyles: string, commonStyles: string): string {
  // Split into arrays for easier processing
  const allStylesArray = allStyles.split(' ').filter(Boolean);
  const commonStylesArray = commonStyles.split(' ').filter(Boolean);
  
  // Array to hold meaningful styles
  const meaningfulStyles: string[] = [];
  
  // Focus on styles that typically change between variants
  const importantPrefixes = [
    'bg-', // Background colors
    'text-', // Text colors
    'border-', // Border styles
    'shadow-', // Shadows
    'rounded-', // Border radius
    'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-', // Padding
    'gap-', // Spacing between items
    'w-', 'h-', // Width and height
    'flex-', 'items-', 'justify-', // Flex properties
    'font-', // Font properties
  ];
  
  // Check each style to see if it's meaningful for variants
  for (const style of allStylesArray) {
    // Skip if it's a common style (appears in all variants)
    if (commonStylesArray.includes(style)) {
      continue;
    }
    
    // Keep styles with important prefixes for variants
    if (importantPrefixes.some(prefix => style.startsWith(prefix))) {
      meaningfulStyles.push(style);
    }
  }
  
  return meaningfulStyles.join(' ');
}

/**
 * Merge two sets of classes, handling conflicts properly
 */
export function mergeUniqueClasses(existing: string, newClasses: string): string {
  const existingArray = existing.split(' ').filter(Boolean);
  const newClassArray = newClasses.split(' ').filter(Boolean);
  
  // Group classes by prefix to handle conflicts (like bg-*)
  const classGroups: Record<string, string[]> = {};
  
  // Define class prefixes that conflict with each other (can't have multiple)
  const prefixGroups = [
    ['bg-'],
    ['text-'],
    ['w-'],
    ['h-'],
    ['p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-'],
    ['m-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-'],
  ];
  
  // Function to find the group for a class based on prefix
  function getClassGroupByPrefix(cls: string, prefixGroups: string[][]): string | null {
    for (let i = 0; i < prefixGroups.length; i++) {
      const group = prefixGroups[i];
      if (group.some(prefix => cls.startsWith(prefix))) {
        return `group${i}`;
      }
    }
    return null;
  }
  
  // Process existing classes
  existingArray.forEach(cls => {
    const group = getClassGroupByPrefix(cls, prefixGroups);
    if (group) {
      classGroups[group] = classGroups[group] || [];
      classGroups[group].push(cls);
    }
  });
  
  // Create result set with existing non-conflicting classes
  const resultSet = new Set(existingArray.filter(cls => !getClassGroupByPrefix(cls, prefixGroups)));
  
  // Add new classes, handling conflicts
  for (const cls of newClassArray) {
    const group = getClassGroupByPrefix(cls, prefixGroups);
    
    // If it's a conflicting class type
    if (group) {
      // Replace existing classes of this type
      classGroups[group] = [cls];
    } else {
      // Non-conflicting, just add it
      resultSet.add(cls);
    }
  }
  
  // Add back in the latest of each conflicting class group
  Object.values(classGroups).forEach(groupClasses => {
    if (groupClasses.length > 0) {
      // Just take the last one as it represents the newest
      resultSet.add(groupClasses[groupClasses.length - 1]);
    }
  });
  
  return Array.from(resultSet).join(' ');
}

/**
 * Check if a node has styles that are significant enough to warrant a container
 */
export function isNodeStyleSignificant(baseClassNames: string): boolean {
  // If no classes, no need for a container
  if (!baseClassNames || baseClassNames.trim() === '') {
    return false;
  }
  
  // Patterns that indicate significant styling that needs its own element
  const significantPatterns = [
    /bg-/, // Background
    /border/, // Border
    /shadow/, // Shadow
    /flex-/, // Flex container properties
    /grid-/, // Grid properties
    /absolute/, /relative/, /fixed/, // Positioning
    /z-/, // Z-index
    /overflow-/, // Overflow
    /opacity-/, // Opacity
    /rounded/, // Border radius
    /m[trblxy]?-/, /p[trblxy]?-/, // Margin and padding
    /h-/, /w-/, /min-h-/, /min-w-/, /max-h-/, /max-w-/ // Size constraints
  ];
  
  // If any significant pattern is found, we need a container
  return significantPatterns.some(pattern => pattern.test(baseClassNames));
}

/**
 * Convert RGB values (0-1) to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  // Convert from 0-1 scale to 0-255
  const rInt = Math.round(r * 255);
  const gInt = Math.round(g * 255);
  const bInt = Math.round(b * 255);
  
  // Convert to hex
  return `#${rInt.toString(16).padStart(2, '0')}${gInt.toString(16).padStart(2, '0')}${bInt.toString(16).padStart(2, '0')}`;
}

/**
 * Find the closest color token for a given hex color
 */
export function findClosestColorToken(hexColor: string, colorTokens: Record<string, ColorToken>): string | null {
  let bestMatch = null;
  let bestDistance = Infinity;
  
  // Convert input color to RGB
  const r1 = parseInt(hexColor.substring(1, 3), 16) / 255;
  const g1 = parseInt(hexColor.substring(3, 5), 16) / 255;
  const b1 = parseInt(hexColor.substring(5, 7), 16) / 255;
  
  // Check each token
  for (const [tokenName, tokenData] of Object.entries(colorTokens)) {
    // Get the actual color value from the token
    const tokenValue = tokenData.value;
    
    // Skip if token value is not a hex color
    if (typeof tokenValue !== 'string' || !tokenValue.startsWith('#')) continue;
    
    // Convert token color to RGB
    const r2 = parseInt(tokenValue.substring(1, 3), 16) / 255;
    const g2 = parseInt(tokenValue.substring(3, 5), 16) / 255;
    const b2 = parseInt(tokenValue.substring(5, 7), 16) / 255;
    
    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
    
    // Update best match if this is closer
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = tokenName;
    }
  }
  
  // Only return a match if it's very close (threshold tunable)
  return bestDistance < 0.1 ? bestMatch : null;
} 