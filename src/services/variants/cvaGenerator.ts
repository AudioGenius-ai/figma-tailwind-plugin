/**
 * @file cvaGenerator.ts
 * This file contains functions for generating CVA (class-variance-authority) definitions
 * for component variants.
 */

import { ComponentStructureNode } from './componentStructure';
import { DesignTokens } from '../../types/designTokenTypes';
import { extractBaseStyles } from './styleProcessor';
import { sanitizeIdentifier } from './nameUtils';

/**
 * Ensure name is in proper PascalCase format
 */
function ensurePascalCase(name: string): string {
  // If the name doesn't start with an uppercase letter, capitalize it
  if (!/^[A-Z]/.test(name)) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

/**
 * Generate CVA definitions for a specific node
 */
export function generateNodeCvaDefinitions(
  node: ComponentStructureNode, 
  allVariantProps: Record<string, string[]>,
  tokens: DesignTokens
): string {
  // Skip nodes that don't need variants or don't have a variant name
  if (Object.keys(node.styles).length <= 1 && !node.variantName) {
    return '';
  }
  
  // Extract base styles that are common across all variants
  const baseClasses = Object.values(node.styles)
    .map(style => style.tailwindClasses)
    .filter(Boolean)
    .join(' ');
  
  // Process base classes to ensure they're clean and optimized
  // Handle transparency explicitly in base styles
  let processedBaseClasses = baseClasses;
  if (baseClasses.includes('bg-transparent')) {
    // Make sure we keep the transparent background in the base styles
    processedBaseClasses = baseClasses;
  } else {
    // Process base classes normally
    processedBaseClasses = extractBaseStyles(baseClasses);
  }
  
  // Log what we found for debugging
  console.log(`Generating CVA for ${node.name}:`, {
    baseClasses: processedBaseClasses,
    variantCount: Object.keys(node.styles).length
  });
  
  // If no variant-specific styles were found, return empty
  const hasVariantStyles = Object.keys(node.styles).length > 1;
  
  if (!hasVariantStyles && !node.variantName) {
    console.log(`No variant styles found for ${node.name}, skipping CVA generation`);
    return '';
  }
  
  // Generate a safe variant name for this node
  let variantName = node.variantName || sanitizeIdentifier(node.cssName);
  if (variantName.length === 0) {
    variantName = sanitizeIdentifier(node.name) || 'element';
  }
  
  // Make the first letter uppercase for variant names
  variantName = ensurePascalCase(variantName);
  
  // Append "Variants" to make it clear this is a CVA definition
  const cvaVariableName = `${variantName}Variants`;
  
  // Generate the CVA definition
  let cvaDefinition = `const ${cvaVariableName} = cva(`;
  
  // Add base classes
  cvaDefinition += `"${processedBaseClasses}"`;
  
  // Add variants section
  cvaDefinition += `, {\n  variants: {\n`;
  
  // Add each variant property
  Object.entries(allVariantProps).forEach(([propKey, propValues]) => {
    const safeKey = sanitizeIdentifier(propKey.toLowerCase());
    
    cvaDefinition += `    ${safeKey}: {\n`;
    
    // Add each value for this property
    propValues.forEach(propValue => {
      const safeValue = sanitizeIdentifier(propValue.toLowerCase());
      
      // Find variant-specific styles for this property value
      let styleValue = '""';
      
      // Look for a variant key that has this property value
      for (const variantKey of Object.keys(node.styles)) {
        // Parse the variant key (e.g. "type=primary:state=default")
        const variantData: Record<string, string> = {};
        variantKey.split(':').forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) {
            variantData[key.toLowerCase()] = value;
          }
        });
        
        // If this variant key has the property value we're looking for
        if (variantData[propKey.toLowerCase()] === propValue) {
          const style = node.styles[variantKey];
          if (style && style.tailwindClasses) {
            styleValue = `"${style.tailwindClasses}"`;
            break;
          }
        }
      }
      
      // Only add a minimal default for disabled state if absolutely no style is defined
      if (styleValue === '""' && propKey.toLowerCase() === 'state' && 
          (propValue.toLowerCase() === 'disabled' || propValue.toLowerCase().includes('disabled'))) {
        styleValue = '"opacity-50 cursor-not-allowed"';
      }
      
      cvaDefinition += `      ${safeValue}: ${styleValue},\n`;
    });
    
    cvaDefinition += `    },\n`;
  });
  
  cvaDefinition += `  },\n`;
  
  // Add default variants
  cvaDefinition += `  defaultVariants: {\n`;
  Object.keys(allVariantProps).forEach(propKey => {
    const safeKey = sanitizeIdentifier(propKey.toLowerCase());
    const values = allVariantProps[propKey];
    
    if (values.length > 0) {
      const safeValue = sanitizeIdentifier(values[0].toLowerCase());
      cvaDefinition += `    ${safeKey}: "${safeValue}",\n`;
    }
  });
  cvaDefinition += `  },\n`;
  
  // Close the CVA definition
  cvaDefinition += `});`;
  
  return cvaDefinition;
}

/**
 * Generate all CVA definitions for a component and its children
 */
export function generateAllCvaDefinitions(
  componentName: string,
  structure: ComponentStructureNode,
  baseStyles: string,
  variantProps: Record<string, string[]>,
  tokens: DesignTokens
): string {
  let cvaDefinitions = '';
  
  // Ensure component name is in PascalCase
  const pascalCaseName = ensurePascalCase(componentName);
  
  // Process the base styles for the main component
  const filteredBaseStyles = extractBaseStyles(baseStyles);
  
  // Generate the main component CVA definition
  const mainComponentCvaName = `${pascalCaseName}Variants`;
  
  cvaDefinitions += `// Main component CVA\n`;
  cvaDefinitions += `const ${mainComponentCvaName} = cva(\n`;
  cvaDefinitions += `  "${filteredBaseStyles}",\n`;
  cvaDefinitions += `  {\n`;
  cvaDefinitions += `    variants: {\n`;
  
  // Add each variant property
  Object.entries(variantProps).forEach(([propKey, propValues]) => {
    const safeKey = sanitizeIdentifier(propKey.toLowerCase());
    
    cvaDefinitions += `      ${safeKey}: {\n`;
    
    // Add each value for this property
    propValues.forEach(propValue => {
      const safeValue = sanitizeIdentifier(propValue.toLowerCase());
      
      // Get variant-specific styles
      let styleValue = '""';
      
      // Look for a variant key that has this property value
      for (const variantKey of Object.keys(structure.styles)) {
        // Parse the variant key (e.g. "type=primary:state=default")
        const variantData: Record<string, string> = {};
        variantKey.split(':').forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) {
            variantData[key.toLowerCase()] = value;
          }
        });
        
        // If this variant key has the property value we're looking for
        if (variantData[propKey.toLowerCase()] === propValue) {
          const style = structure.styles[variantKey];
          if (style && style.tailwindClasses) {
            styleValue = `"${style.tailwindClasses}"`;
            break;
          }
        }
      }
      
      // Add default for disabled state
      if (styleValue === '""' && propKey.toLowerCase() === 'state' && 
          (propValue.toLowerCase() === 'disabled' || propValue.toLowerCase().includes('disabled'))) {
        styleValue = '"opacity-50 cursor-not-allowed"';
      }
      
      cvaDefinitions += `        ${safeValue}: ${styleValue},\n`;
    });
    
    cvaDefinitions += `      },\n`;
  });
  
  cvaDefinitions += `    },\n`;
  
  // Add default variants
  cvaDefinitions += `    defaultVariants: {\n`;
  Object.keys(variantProps).forEach(propKey => {
    const safeKey = sanitizeIdentifier(propKey.toLowerCase());
    const values = variantProps[propKey];
    
    if (values.length > 0) {
      const safeValue = sanitizeIdentifier(values[0].toLowerCase());
      cvaDefinitions += `      ${safeKey}: "${safeValue}",\n`;
    }
  });
  cvaDefinitions += `    },\n`;
  cvaDefinitions += `  },\n`;
  cvaDefinitions += `);\n\n`;
  
  // Generate CVA definitions for child nodes if needed
  for (const child of structure.children) {
    // Skip nodes that don't need variants
    if (Object.keys(child.styles).length <= 1 && !child.variantName) continue;
    
    const nodeCvaDefinitions = generateNodeCvaDefinitions(child, variantProps, tokens);
    if (nodeCvaDefinitions) {
      cvaDefinitions += nodeCvaDefinitions + '\n\n';
    }
  }
  
  return cvaDefinitions;
} 