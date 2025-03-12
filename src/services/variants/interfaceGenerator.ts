/**
 * @file interfaceGenerator.ts
 * This file contains functions for generating TypeScript interfaces
 * for component props.
 */

import { sanitizeIdentifier } from './nameUtils';

/**
 * Generate TypeScript interface for component props
 */
export function generatePropsInterface(
  componentName: string,
  variantProps: Record<string, string[]>
): string {
  let interfaceStr = `interface ${componentName}Props {\n`;
  
  // Add each variant property as optional with its appropriate union type
  Object.entries(variantProps).forEach(([propKey, values]) => {
    if (values.length > 0) {
      // Format each value with proper quotes and make sure they're sanitized for use as TypeScript literals
      const valueUnion = values.map(value => 
        `"${sanitizeIdentifier(value.toLowerCase())}"`
      ).join(' | ');
      
      // Add the prop with its type to the interface
      const safeKey = sanitizeIdentifier(propKey.toLowerCase());
      interfaceStr += `  ${safeKey}?: ${valueUnion};\n`;
    }
  });
  
  // Add className for external styling
  interfaceStr += `  className?: string;\n`;
  
  // Close the interface
  interfaceStr += `}\n\n`;
  
  return interfaceStr;
} 