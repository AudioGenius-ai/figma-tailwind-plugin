import { generateComponentName } from '../../utils/nameUtils';
import { getComponentProps } from '../utils/nodeUtils';

/**
 * Generates an SVG component from a vector node by referencing it as an asset
 */
export async function generateSvgComponent(node: SceneNode, tailwindClasses: string): Promise<string> {
  // Check if this is an instance of a vector/icon component
  if (node.type === 'INSTANCE' && 'mainComponent' in node && node.mainComponent) {
    // Use type assertion to correctly type the mainComponent
    const mainComponent = node.mainComponent as ComponentNode;
    const componentName = generateComponentName(mainComponent.name);
    
    // If this is a vector instance, we should use the component instead of generating SVG
    if (mainComponent.name.toLowerCase().includes('icon') || 
        mainComponent.children?.some(child => child.type === 'VECTOR')) {
      console.log(`Using component reference for vector instance: ${node.name} -> ${componentName}`);
      
      // Get props from the instance
      const props = getComponentProps(node);
      const propsString = props.length > 0 ? ` ${props.join(' ')}` : '';
      
      return `<${componentName}${propsString} className="${tailwindClasses}" />\n`;
    }
  }

  // Generate asset name from node name
  const assetName = node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Return an img tag referencing the SVG asset
  return `<img 
  src={require('assets/svg/${assetName}.svg')} 
  alt="${node.name}"
  className="${tailwindClasses}"
  loading="lazy"
/>\n`;
} 