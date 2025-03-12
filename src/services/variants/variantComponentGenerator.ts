/**
 * @file variantComponentGenerator.ts
 * This file contains logic for generating React components with variants using class-variance-authority.
 * It analyzes Figma component sets and generates optimized code that uses CVA to handle style variations.
 */

import { DesignTokens } from '../../types/designTokenTypes';
import { Bounds } from '../utils/nodeUtils';
import { getVariantPropsFromComponentSet } from './variantUtils';
import { extractCommonClassesFromStyles } from './styleProcessor';
import { generateComponentName } from './nameUtils';
import { generatePropsInterface } from './interfaceGenerator';
import { generateAllCvaDefinitions } from './cvaGenerator';
import { generateRenderContentFromStructure } from './renderUtils';
import { analyzeComponentStructure, ComponentStructureNode } from './componentStructure';

/**
 * Generate a React component from a Figma component set with variants
 */
export async function generateComponentWithVariants(
  componentSet: ComponentSetNode,
  tokens: DesignTokens,
  parentBounds?: Bounds
): Promise<string> {
  // Step 1: Setup
  const componentName = generateComponentName(componentSet.name);
  const variantProps = getVariantPropsFromComponentSet(componentSet);
  console.log('Analyzing component variants for:', componentName);
  
  // Step 2: Analyze component structure - now the root directly has component styles
  const componentStructure = await analyzeComponentStructure(componentSet, tokens, variantProps);
  
  // Step 3: Extract common and variant-specific styles
  const baseStyles = extractCommonClassesFromStyles(componentStructure.styles);
  
  // Step 4: Generate component code with our new approach
  const componentCode = generateComponentCode(
    componentName,
    componentStructure,
    baseStyles,
    variantProps,
    tokens
  );
  
  return componentCode;
}

/**
 * Generate the final component code
 */
function generateComponentCode(
  componentName: string,
  structure: ComponentStructureNode,
  baseStyles: string,
  variantProps: Record<string, string[]>,
  tokens: DesignTokens
): string {
  // Generate the props interface
  const propsInterface = generatePropsInterface(componentName, variantProps);
  
  // Generate CVA definitions
  const cvaDefinitions = generateAllCvaDefinitions(
    componentName,
    structure,
    baseStyles,
    variantProps,
    tokens
  );
  
  // Generate the render content
  const renderContent = generateRenderContentFromStructure(structure, variantProps);
  
  // Combine everything into a single component
  let componentCode = '';
  componentCode += `import { cva } from "class-variance-authority";\n`;
  componentCode += `import { cn } from "@/lib/utils";\n\n`;
  
  // Add the props interface
  componentCode += propsInterface;
  
  // Add the CVA definitions
  componentCode += cvaDefinitions;
  
  // Add the component function
  componentCode += `export function ${componentName}({\n`;
  
  // Add destructured props with defaults
  const propKeys = Object.keys(variantProps).map(key => key.toLowerCase().split(' ').join('_'));
  if (propKeys?.length > 0) {
    propKeys.forEach((key) => {
      // Use the first value as default
      const firstValue = variantProps[key]?.length > 0 ? 
        `"${variantProps[key][0].toLowerCase().split(' ').join('_')}"` : 
        'undefined';
      
      componentCode += `  ${key.toLowerCase().split(' ').join('_')} = ${firstValue},\n`;
    });
  }
  
  // Add className prop
  componentCode += `  className,\n`;
  
  // Close the destructuring
  componentCode += `  ...props\n`;
  componentCode += `}: ${componentName}Props) {\n`;
  
  // Create a props object for the variants
  componentCode += `  // Create a variant props object for passing to CVA functions\n`;
  componentCode += `  const variantProps = {\n`;
  propKeys.forEach(key => {
    componentCode += `    ${key.toLowerCase()},\n`;
  });
  componentCode += `  };\n\n`;
  
  // Add the component return statement with proper className handling
  componentCode += `  return (\n`;
  componentCode += `    <div className={cn(${componentName}Variants(variantProps), className)} {...props}>\n`;
  componentCode += `      ${renderContent}\n`;
  componentCode += `    </div>\n`;
  componentCode += `  );\n`;
  componentCode += `}\n`;
  
  return componentCode;
} 