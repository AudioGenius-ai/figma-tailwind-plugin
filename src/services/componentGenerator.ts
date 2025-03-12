import { extractStyles } from './styleExtractor';
import { stylesToTailwind } from '../transformers/stylesToTailwind';
import { generateComponentName } from '../utils/nameUtils';
import { DesignTokens } from '../types/designTokenTypes';
import { 
  isNodeVisible, 
  getNodeBounds, 
  isNodeOutsideBounds, 
  getComponentProps, 
  getComponentSet,
  Bounds
} from './utils/nodeUtils';
import { formatCode, cleanupTailwindClasses } from './utils/styleUtils';
import { generateComponentBody } from './components/componentBody';
import { generateComponentWithVariants } from './variants/variantComponentGenerator';
import { isImageNode } from './components/imageComponent';

/**
 * Helper function to extract image assets from nodes with image fills
 */
async function extractImageAssets(node: SceneNode, styles: any): Promise<void> {
  // Skip if no fills property
  if (!('fills' in node)) return;
  
  const fills = node.fills as readonly Paint[];
  if (!Array.isArray(fills) || fills.length === 0) return;
  
  // Look for image fills
  const imageFill = fills.find(fill => fill.type === 'IMAGE' && fill.visible !== false);
  if (!imageFill || imageFill.type !== 'IMAGE') return;
  
  try {
    // Check if the image has a hash
    if ('imageHash' in imageFill && imageFill.imageHash) {
      console.log(`Found image fill with hash: ${imageFill.imageHash}`);
      
      // Set background image hash in styles
      styles.backgroundImage = true;
      styles.backgroundImageHash = imageFill.imageHash;
      
      // Try to export the image if possible
      try {
        // For nodes that can be exported directly
        if ('exportAsync' in node) {
          // This would be implemented based on your specific asset export and management needs
          console.log(`Exporting image from node: ${node.name}`);
          // Example: const pngData = await node.exportAsync({ format: 'PNG' });
          // Then store or process this image data
        }
      } catch (exportError) {
        console.error('Error exporting image:', exportError);
      }
      
      // Set background size based on scaleMode
      if ('scaleMode' in imageFill) {
        styles.backgroundSize = imageFill.scaleMode === 'FILL' ? 'cover' : 'contain';
      } else {
        styles.backgroundSize = 'cover'; // Default to cover
      }
    }
  } catch (error) {
    console.error('Error extracting image asset:', error);
  }
}

/**
 * Main function to generate a React component from a Figma node
 */
export async function generateReactComponent(
  node: SceneNode,
  tokens: DesignTokens,
  isRoot: boolean = false,
  parentBounds?: Bounds
): Promise<string> {
  console.log('Generating React component for node:', node.name, node.type);
  // If this is a root component/instance, try to get its component set
  if (isRoot && (node.type === 'COMPONENT' || node.type === 'INSTANCE')) {
    const componentSet = await getComponentSet(node);
    if (componentSet) {
      // Generate a component with all variants
      return generateComponentWithVariants(componentSet, tokens, parentBounds);
    }
  }
  
  // If this is a component set, generate a component with all variants
  if (node.type === 'COMPONENT_SET') {
    return generateComponentWithVariants(node, tokens, parentBounds);
  }
  
  // Skip if this is a child of a component set (handled by the parent)
  if (!isRoot && node.parent?.type === 'COMPONENT_SET') {
    return '';
  }

  // For root nodes, use viewport bounds or node's own bounds
  const bounds = isRoot ? 
    getNodeBounds(node) || { x: 0, y: 0, width: figma.viewport.bounds.width, height: figma.viewport.bounds.height } :
    (parentBounds || getNodeBounds(node));

  // Skip nodes that are invisible
  if (!isNodeVisible(node)) {
    return '';
  }
  
  // For non-root nodes, check if they're outside bounds
  if (!isRoot && bounds && isNodeOutsideBounds(node, bounds)) {
    return '';
  }

  const componentName = generateComponentName(node.name);
  const styles = await extractStyles(node);
  
  // Check if node has image fills and extract assets
  if (isImageNode(node)) {
    await extractImageAssets(node, styles);
  }

  const tailwindClasses = cleanupTailwindClasses(stylesToTailwind(styles, tokens));
  
  let childComponents = '';
  let childContent = '';
  
  // Handle children
  if ('children' in node && node.children) {
    const childBounds = getNodeBounds(node);
    
    for (const child of node.children) {
      
      // Check if child has image fills and extract assets
      if (isImageNode(child)) {
        const childStyles = await extractStyles(child);
        await extractImageAssets(child, childStyles);
      }
      
      // Ensure we have a line break if we already have content
      if (childContent && !childContent.endsWith('\n')) {
        childContent += '\n';
      }
      
      if (child.type === 'INSTANCE') {
        const mainComponent = await child.getMainComponentAsync();
        if (mainComponent) {
          // Extract the base component name - take the part before any comma
          // which usually separates the component name from its variants
          const baseComponentName = child.name.split(',')[0].trim();
          const instanceComponentName = generateComponentName(baseComponentName);
          
          // Extract variant properties from the instance
          const props = getComponentProps(child);
          const propsString = props.length > 0 ? ` ${props.join(' ')}` : '';
          
          childContent += `      <${instanceComponentName}${propsString} id="${child.name}" />`;
        } else {
          const generatedContent = await generateComponentBody(child, tokens);
          // Preserve formatting for multiline content
          childContent += generatedContent;
        }
      } else if (child.type === 'COMPONENT' || child.type === 'COMPONENT_SET') {
        // Only generate component if it's not part of a component set
        if (child.parent?.type !== 'COMPONENT_SET') {
          childComponents += await generateReactComponent(child, tokens, false, childBounds) + '\n\n';
          const props = getComponentProps(child);
          const propsString = props.length > 0 ? ` ${props.join(' ')}` : '';
          childContent += `      <${generateComponentName(child.name)}${propsString} />`;
        }
      } else {
        // Handle regular node, preserve formatting for multiline content
        const generatedContent = await generateComponentBody(child, tokens);
        childContent += generatedContent;
      }
    }
  }
  
  // For text nodes, use the text content
  if (node.type === 'TEXT') {
    childContent = node.characters;
  }
  
  // Create the component
  let component = '';
  
  if (isRoot || node.type === 'COMPONENT') {
    const formattedChildren = childContent.trim();
    
    // Get any props that should be passed to this component
    const props = getComponentProps(node);
    const propsDeclaration = props.length > 0 ? 
      `{ ${props.map(p => p.includes('=') ? p.split('=')[0] : p).join(', ')} }` : 
      '';
    
    // Check if we need a wrapper div
    const needsWrapper = isRoot || 
                        tailwindClasses.includes('relative') || 
                        tailwindClasses.includes('absolute') ||
                        tailwindClasses.includes('flex') ||
                        tailwindClasses.includes('grid') ||
                        tailwindClasses.includes('overflow');
    
    const wrapperDiv = needsWrapper ?
      `<div className="${tailwindClasses}">${formattedChildren}</div>` :
      formattedChildren.trim() || '<></>';
    
    // Root/Component nodes should be containers only if they have layout-affecting styles
    component = [
      `function ${componentName}(${propsDeclaration}) {`,
      `  return (`,
      `    ${wrapperDiv}`,
      `  );`,
      `}`,
      ``,
      `export default ${componentName};`
    ].join('\n');
  } else {
    component = await generateComponentBody(node, tokens);
  }
  
  return childComponents + component;
}
