import { DesignTokens } from '../../types/designTokenTypes';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Helper to check if a node and all its parents are visible
 */
export function isNodeVisible(node: SceneNode): boolean {
  let current: BaseNode | null = node;
  
  while (current) {
    // Check if node is marked as visible
    if ('visible' in current && !current.visible) {
      return false;
    }
    
    // Check if node has 0 opacity
    if ('opacity' in current && current.opacity === 0) {
      return false;
    }
    
    // Check if node has render bounds (if it's actually rendered)
    if ('absoluteRenderBounds' in current && !current.absoluteRenderBounds) {
      return false;
    }
    
    current = 'parent' in current ? current.parent : null;
  }
  
  return true;
}

/**
 * Helper to get node bounds accounting for all rendered properties
 */
export function getNodeBounds(node: SceneNode): Bounds | undefined {
  // First try to use absoluteRenderBounds which includes all visual effects
  if ('absoluteRenderBounds' in node && node.absoluteRenderBounds) {
    return {
      x: node.absoluteRenderBounds.x,
      y: node.absoluteRenderBounds.y,
      width: node.absoluteRenderBounds.width,
      height: node.absoluteRenderBounds.height
    };
  }
  
  // Fall back to absoluteBoundingBox if render bounds aren't available
  if (node.absoluteBoundingBox) {
    return {
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height
    };
  }
  
  return undefined;
}

/**
 * Helper to check if a node is outside given bounds
 */
export function isNodeOutsideBounds(node: SceneNode, bounds: Bounds): boolean {
  const nodeBounds = getNodeBounds(node);
  if (!nodeBounds) return false; // If we can't determine bounds, assume it's inside
  
  // For root level nodes, only check if they have negative coordinates
  if (!('parent' in node) || !node.parent) {
    return nodeBounds.x < 0 || nodeBounds.y < 0;
  }
  
  // For child nodes, check if they're within their parent's bounds
  return (
    nodeBounds.x < bounds.x || 
    nodeBounds.y < bounds.y ||
    nodeBounds.x + nodeBounds.width > bounds.x + bounds.width ||
    nodeBounds.y + nodeBounds.height > bounds.y + bounds.height
  );
}

/**
 * Helper to sanitize component property names to valid JSX attribute names
 * Converts dots to underscores to avoid JSX syntax errors
 */
function sanitizePropertyName(propName: string): string {
  // Replace dots with underscores
  return propName.replace(/\./g, '_');
}

/**
 * Helper to get component props
 */
export function getComponentProps(node: SceneNode): string[] {
  const props: string[] = [];
  
  // Add component properties
  if ('componentProperties' in node && node.componentProperties) {
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      // Sanitize the property name to ensure it's a valid JSX attribute
      const safeKey = sanitizePropertyName(key);
      
      // Handle different types of property values
      if (typeof value === 'string') {
        props.push(`${safeKey}="${value}"`);
      } else if (typeof value === 'boolean') {
        if (value) {
          props.push(safeKey);
        }
      }
    });
  }

  // Add variant properties
  if ('variantProperties' in node && node.variantProperties) {
    Object.entries(node.variantProperties).forEach(([key, value]) => {
      // First sanitize the key to remove dots, then handle spaces
      const safeKey = sanitizePropertyName(key).split(' ').join('_').toLowerCase();
      props.push(`${safeKey}="${value}"`);
    });
  }

  return props;
}

/**
 * Helper to get the component set for a node
 */
export async function getComponentSet(node: SceneNode): Promise<ComponentSetNode | null> {
  if (node.type === 'COMPONENT_SET') {
    return node;
  }
  if (node.type === 'COMPONENT') {
    return node.parent?.type === 'COMPONENT_SET' ? node.parent : null;
  }
  if (node.type === 'INSTANCE') {
    const mainComponent = await node.getMainComponentAsync();
    if (mainComponent?.parent?.type === 'COMPONENT_SET') {
      return mainComponent.parent;
    }
  }
  return null;
}

/**
 * Helper to generate position styles
 */
export function getPositionStyles(node: SceneNode): string {
  // Only apply absolute positioning if the node has layoutPositioning === 'ABSOLUTE'
  // or if it's a direct child of a frame/component with auto-layout disabled
  const shouldPosition = 
    ('layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE') ||
    (node.parent && 'layoutMode' in node.parent && node.parent.layoutMode === 'NONE');

  if (!shouldPosition) return '';

  let positionClasses = 'absolute ';

  // Add position classes
  if ('x' in node && 'y' in node) {
    positionClasses += `left-[${Math.round(node.x)}px] top-[${Math.round(node.y)}px] `;
  }

  // Add size classes if available
  if ('width' in node && 'height' in node) {
    positionClasses += `w-[${Math.round(node.width)}px] h-[${Math.round(node.height)}px] `;
  }

  // Add rotation if available
  if ('rotation' in node && node.rotation !== 0) {
    const degrees = Math.round(node.rotation * (180 / Math.PI));
    positionClasses += `rotate-[${degrees}deg] `;
  }

  return positionClasses;
} 