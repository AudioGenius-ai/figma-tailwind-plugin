import { DesignTokens } from '../../types/designTokenTypes';
import { Bounds } from '../utils/nodeUtils';
import { generateComponentBody } from '../components/componentBody';
import { extractStyles } from '../styleExtractor';
import { stylesToTailwind } from '../../transformers/stylesToTailwind';
import { cleanupTailwindClasses } from '../utils/styleUtils';

/**
 * Get all unique variant props from a component set
 */
export function getVariantPropsFromComponentSet(componentSet: ComponentSetNode): Record<string, string[]> {
  const variantProps: Record<string, Set<string>> = {};
  
  if ('children' in componentSet) {
    for (const child of componentSet.children) {
      if (child.type === 'COMPONENT' && child.variantProperties) {
        Object.entries(child.variantProperties).forEach(([key, value]) => {
          if (!variantProps[key]) {
            variantProps[key] = new Set();
          }
          variantProps[key].add(value);
        });
      }
    }
  }
  
  // Convert sets to arrays
  const result: Record<string, string[]> = {};
  Object.entries(variantProps).forEach(([key, values]) => {
    result[key] = Array.from(values);
  });
  
  return result;
}

/**
 * Generate a map of variant combinations to component children
 */
export async function generateVariantMap(
  componentSet: ComponentSetNode, 
  tokens: DesignTokens,
  parentBounds?: Bounds
): Promise<Record<string, string>> {
  const variantMap: Record<string, string> = {};
  
  if ('children' in componentSet) {
    for (const child of componentSet.children) {
      if (child.type === 'COMPONENT' && child.variantProperties) {
        // Create a variant key (e.g., "size=large:variant=primary")
        const variantKey = Object.entries(child.variantProperties)
          .map(([key, value]) => `${key}=${value}`)
          .join(':');
        
        // Generate the content for this variant
        let childContent = '';
        if ('children' in child && child.children) {
          for (const grandchild of child.children) {
            childContent += await generateComponentBody(grandchild, tokens);
          }
        }
        
        variantMap[variantKey] = childContent.trim();
      }
    }
  }
  
  return variantMap;
}

/**
 * Extract tailwind classes for each variant
 */
export async function extractVariantStyles(
  componentSet: ComponentSetNode, 
  tokens: DesignTokens,
  parentBounds?: Bounds
): Promise<Record<string, Record<string, string>>> {
  const variantProps = getVariantPropsFromComponentSet(componentSet);
  const variantStyles: Record<string, Record<string, string>> = {};
  
  // Initialize variant styles object
  Object.keys(variantProps).forEach(key => {
    variantStyles[key] = {};
    variantProps[key].forEach(value => {
      variantStyles[key][value] = '';
    });
  });
  
  // Extract styles for each variant
  if ('children' in componentSet) {
    for (const child of componentSet.children) {
      if (child.type === 'COMPONENT' && child.variantProperties) {
        const styles = await extractStyles(child);
        const tailwindClasses = cleanupTailwindClasses(stylesToTailwind(styles, tokens));
        
        // Associate these styles with each variant property of this component
        Object.entries(child.variantProperties).forEach(([key, value]) => {
          // Merge with existing styles or set new ones
          const existingStyles = variantStyles[key][value] || '';
          const combinedStyles = [existingStyles, tailwindClasses].filter(Boolean).join(' ');
          variantStyles[key][value] = combinedStyles;
        });
      }
    }
  }
  
  return variantStyles;
} 