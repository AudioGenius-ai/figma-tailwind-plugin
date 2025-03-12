/**
 * @file renderUtils.ts
 * This file contains functions for generating JSX rendering code
 * from component structures.
 */

import { ComponentStructureNode } from './componentStructure';
import { sanitizeIdentifier } from './nameUtils';

/**
 * Generate JSX render content from the component structure
 */
export function generateRenderContentFromStructure(
  structure: ComponentStructureNode,
  allVariantProps: Record<string, string[]>
): string {
  // If no children, return an empty fragment
  if (structure.children.length === 0) {
    return '<></>';
  }
  
  // Use React Fragment to wrap multiple children
  return `<>\n${structure.children.map(child => 
    '    ' + generateNodeJsx(child, 2, allVariantProps).trim()
  ).join('\n')}\n  </>`;
}

/**
 * Generate JSX for a node and its children
 */
export function generateNodeJsx(
  node: ComponentStructureNode, 
  indentLevel: number,
  allVariantProps: Record<string, string[]>
): string {
  const indent = '  '.repeat(indentLevel);
  const childIndent = '  '.repeat(indentLevel + 1);
  
  // Helper to get appropriate variant props string
  const getVariantProps = () => {
    if (Object.keys(allVariantProps).length === 0) {
      return '';
    }
    return '{ ' + Object.keys(allVariantProps)
      .map(key => sanitizeIdentifier(key.toLowerCase()))
      .join(', ') + ' }';
  };

  // Helper to create a compact props object for CVA
  const getCompactProps = (propName: string) => {
    if (Object.keys(allVariantProps).length === 0) {
      return '{}';
    }
    // Creates a more compact { size } instead of { size, state, type }
    return `{ ${propName} }`;
  };
  
  // For component instances, render them directly with appropriate variant props
  if (node.type === 'component' && node.componentName) {
    // Component instances should receive the variant props
    let propsStr = '';
    
    // Check if the component has specific props defined
    if (node.componentProps && node.componentProps.length > 0) {
      propsStr = ' ' + node.componentProps.join(' ');
    } else {
      // Otherwise pass down the variant props from parent
      const propKeys = Object.keys(allVariantProps);
      if (propKeys.length > 0) {
        // Pass each variant prop individually
        propsStr = ' ' + propKeys
          .map(key => {
            const safeKey = sanitizeIdentifier(key.toLowerCase());
            return `${safeKey}={${safeKey}}`;
          })
          .join(' ');
      }
    }
    
    return `${indent}<${node.componentName}${propsStr} />`;
  }
  
  // Generate a variant name for CVA using the cssName
  const variantName = node.variantName || sanitizeIdentifier(node.cssName || node.name);
  if (!variantName) {
    // Skip nodes without a valid name - very unlikely
    return `${indent}<!-- Unnamed node: ${node.id} -->`;
  }
  
  // Create a properly capitalized variant name for the CVA function
  const cvaName = variantName.charAt(0).toUpperCase() + variantName.slice(1) + 'Variants';
  
  // Check if we need CVA variant styling for this node
  const needsVariantStyling = Object.keys(node.styles).length > 1 || node.variantName;
  
  // For images, render an img tag
  if (node.type === 'img') {
    const src = node.assetPath || '';
    const alt = node.name || 'image';
    
    if (needsVariantStyling) {
      // Image with variants
      return `${indent}<img src="${src}" alt="${alt}" className={${cvaName}(${getVariantProps()})} />`;
    } else {
      // Image without variants - use a basic class if available
      const baseClass = node.styles && Object.keys(node.styles)[0] ? 
        node.styles[Object.keys(node.styles)[0]].tailwindClasses || '' : '';
      return `${indent}<img src="${src}" alt="${alt}" className="${baseClass}" />`;
    }
  }
  
  // For text nodes, make sure to handle variant-specific content
  if (node.type === 'span' && node.content) {
    // If we have different content per variant
    if (Object.keys(node.content).length > 1) {
      // Create a content switch based on variants
      const firstVariantKey = Object.keys(allVariantProps)[0];
      if (firstVariantKey) {
        const safeKey = sanitizeIdentifier(firstVariantKey.toLowerCase());
        // Use a conditional to select content based on the first variant
        let textContent = `{\n`;
        textContent += `${childIndent}(() => {\n`;
        textContent += `${childIndent}  switch(${safeKey}) {\n`;
        
        // Add case for each variant value with different content
        Object.entries(node.content).forEach(([variantKey, content]) => {
          // Parse the variant key to extract the value for our first variant property
          const variantObj: Record<string, string> = {};
          variantKey.split(':').forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
              variantObj[key.toLowerCase()] = value;
            }
          });
          
          const variantValue = variantObj[firstVariantKey.toLowerCase()];
          if (variantValue) {
            textContent += `${childIndent}    case "${variantValue}":\n`;
            textContent += `${childIndent}      return "${content}";\n`;
          }
        });
        
        // Add default case
        const defaultContent = node.content[Object.keys(node.content)[0]] || '';
        textContent += `${childIndent}    default:\n`;
        textContent += `${childIndent}      return "${defaultContent}";\n`;
        textContent += `${childIndent}  }\n`;
        textContent += `${childIndent}})()`;
        textContent += `\n${indent}}`;
        
        // If we have variant styles, use them
        if (needsVariantStyling) {
          return `${indent}<span className={${cvaName}(${getVariantProps()})}>${textContent}</span>`;
        } else {
          // Use base style
          const baseClass = node.styles && Object.keys(node.styles)[0] ? 
            node.styles[Object.keys(node.styles)[0]].tailwindClasses || '' : '';
          return `${indent}<span className="${baseClass}">${textContent}</span>`;
        }
      }
    }
    
    // Simple text node with single content
    const content = typeof node.content === 'string' 
      ? node.content 
      : node.content[Object.keys(node.content)[0]] || '';
    
    if (needsVariantStyling) {
      // Text with variants
      return `${indent}<span className={${cvaName}(${getVariantProps()})}>${content}</span>`;
    } else {
      // Get base styles directly from the node if available
      const baseClass = node.styles && Object.keys(node.styles)[0] ? 
        node.styles[Object.keys(node.styles)[0]].tailwindClasses || '' : '';
      return `${indent}<span className="${baseClass}">${content}</span>`;
    }
  }
  
  // For regular elements with children
  let tagName = node.type || 'div';
  let classNameProp = '';
  
  // If this node has variants, add the variant className
  if (needsVariantStyling) {
    classNameProp = ` className={${cvaName}(${getVariantProps()})}`;
  } else {
    // Use base styles directly
    const baseClass = node.styles && Object.keys(node.styles)[0] ? 
      node.styles[Object.keys(node.styles)[0]].tailwindClasses || '' : '';
    if (baseClass) {
      classNameProp = ` className="${baseClass}"`;
    }
  }
  
  // Opening tag
  let nodeJsx = `${indent}<${tagName}${classNameProp}>`;
  
  // For elements with children
  if (node.children && node.children.length > 0) {
    nodeJsx += '\n';
    // Render each child
    node.children.forEach(child => {
      nodeJsx += generateNodeJsx(child, indentLevel + 1, allVariantProps) + '\n';
    });
    // Closing tag with proper indentation
    nodeJsx += `${indent}</${tagName}>`;
  } else {
    // Self-closing tag for empty elements
    nodeJsx = `${indent}<${tagName}${classNameProp} />`;
  }
  
  return nodeJsx;
} 