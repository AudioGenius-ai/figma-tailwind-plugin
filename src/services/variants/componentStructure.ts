/**
 * @file componentStructure.ts
 * This file contains types and functions for analyzing component structure
 * and building the component tree representation.
 */

import { extractStyles } from '../styleExtractor';
import { 
  stylesToTailwind as convertStylesToTailwind,
  findMatchingColor,
  findMatchingToken
} from '../../transformers/stylesToTailwind';
import { cleanupTailwindClasses as cleanupClasses } from '../utils/styleUtils';
import { getComponentProps } from '../utils/nodeUtils';
import { DesignTokens } from '../../types/designTokenTypes';
import { isImageNode } from '../components/imageComponent';
import { processStyles } from './styleProcessor';
import { generateSemanticName, sanitizeIdentifier } from './nameUtils';

// Mock function for asset path extraction since we don't have the actual module
async function getNodeAssetPath(node: SceneNode): Promise<string | null> {
  // In a real implementation, this would extract the actual asset path
  return 'assets/svg/vector.svg';
}

/**
 * Represents a variant property with its possible values
 */
export interface VariantProperty {
  name: string;
  values: string[];
}

/**
 * Represents style information for a component node
 */
export interface NodeStyle {
  tailwindClasses: string;
  originalStyles: Record<string, any>;
}

/**
 * Maps variant combinations to style information
 */
export interface VariantStyleMap {
  [variantKey: string]: NodeStyle;
}

/**
 * Represents a node in the component structure
 */
export interface ComponentStructureNode {
  id: string;                                   // Unique node identifier
  name: string;                                 // Semantic name for the node
  type: string;                                 // Node type (e.g., 'div', 'img', 'h4')
  cssName: string;                              // Name to use for CVA variants
  variantName?: string;                         // The unique variant name used for this node
  children: ComponentStructureNode[];           // Child nodes
  parent?: ComponentStructureNode;              // Reference to parent node
  present: Record<string, boolean>;             // If the node is present in each variant
  styles: VariantStyleMap;                      // Styles for each variant with original information
  content?: Record<string, string>;             // Content for each variant (for text nodes)
  assetPath?: string;                           // Asset path (for image nodes)
  componentName?: string;                       // Name of the component instance
  componentProps?: any[];                       // Props of the component instance
}

/**
 * Analyze the component structure by looking at all variants
 */
export async function analyzeComponentStructure(
  componentSet: ComponentSetNode,
  tokens: DesignTokens,
  variantProps: Record<string, string[]>
): Promise<ComponentStructureNode> {
  // Create the root node that will contain all component content
  const root: ComponentStructureNode = {
    id: 'root',
    name: componentSet.name,
    type: 'div',
    cssName: 'component',
    children: [],
    present: {},
    styles: {}
  };
  
  // Map to track node info across variants
  const nodeMap = new Map<string, {
    node: SceneNode,
    type: string,
    styles: Record<string, string>,
    name: string,
    content?: Record<string, string>,
    assetPath?: string,
    variants: Record<string, boolean>,
    originalStyles?: Record<string, any>
  }>();
  
  // First pass: gather information about all nodes across all variants
  if ('children' in componentSet) {
    for (const child of componentSet.children) {
      console.log('Processing component variant:', child.name);
      
      if (child.type === 'COMPONENT' && child.variantProperties) {
        // Create a variant key (e.g., "size=large:state=primary")
        const variantKey = Object.entries(child.variantProperties)
          .map(([key, value]) => `${key}=${value}`)
          .join(':');
        
        // Extract styles from the component variant itself 
        const componentStyles = await extractStyles(child);
        const processedStyles = processStyles(componentStyles, tokens);
        const componentTailwindClasses = cleanupClasses(convertStylesToTailwind(processedStyles, tokens));
        
        // Store the component's styles directly on the root node
        if (!root.styles[variantKey]) {
          root.styles[variantKey] = {
            tailwindClasses: componentTailwindClasses,
            originalStyles: componentStyles
          };
        }
        
        // Mark this variant as present in the root node
        root.present[variantKey] = true;
        
        // Process child nodes to build the component structure
        if ('children' in child && child.children) {
          await processComponentChildren(child.children, variantKey, nodeMap, tokens);
        }
      }
    }
  }
  
  // Second pass: build the component structure tree and attach it to the root
  const childNodes = await buildNodeStructure(nodeMap, variantProps);
  root.children = childNodes;
  
  return root;
}

/**
 * Process component children to gather information about nodes
 */
export async function processComponentChildren(
  nodes: readonly SceneNode[],
  variantKey: string,
  nodeMap: Map<string, any>,
  tokens: DesignTokens,
  parentId: string = '',
  level: number = 0
): Promise<void> {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeId = parentId ? `${parentId}_${i}` : `node_${i}`;
    
    // Check if node has image fills and extract them
    if (isImageNode(node)) {
      const styles = await extractStyles(node);
      await extractImageAssets(node, styles);
    }
    
    // Handle component instances specially
    if (node.type === 'INSTANCE') {
      let mainComponent;
      try {
        mainComponent = await node.getMainComponentAsync();
      } catch (error) {
        console.error('Error getting main component:', error);
      }
      
      if (mainComponent) {
        // Extract the base component name - take the part before any comma
        // which usually separates the component name from its variants
        const baseComponentName = node.name.split(',')[0].trim();
        const instanceComponentName = baseComponentName;
        
        // Extract variant properties from the instance
        const props = getComponentProps(node);
        
        // Store node info as a component reference
        nodeMap.set(nodeId, {
          node,
          type: 'component',
          styles: { [variantKey]: '' },
          name: baseComponentName,
          componentName: instanceComponentName,
          props: props,
          variants: { [variantKey]: true }
        });
        
        console.log('Found instance component:', baseComponentName, '->', instanceComponentName);
        
        // Don't process children of instances - they're references to components
        continue;
      }
    }
    
    // Extract styles
    const styles = await extractStyles(node);
    // Process styles to ensure correct color handling
    const processedStyles = processStyles(styles, tokens);
    const tailwindClasses = cleanupClasses(convertStylesToTailwind(processedStyles, tokens));
    
    // Generate semantic name for node
    const semanticName = generateSemanticName(node, i, level);
    
    // Determine node type
    let nodeType = 'div';
    let content: string | undefined = undefined;
    let assetPath: string | undefined = undefined;
    
    if (node.type === 'TEXT') {
      // For text nodes, determine the right semantic tag
      if (node.name.toLowerCase().includes('heading') || 
          tailwindClasses.includes('text-2xl') ||
          tailwindClasses.includes('text-3xl')) {
        nodeType = 'h4';
      } else if (node.characters.length > 100 || 
                node.characters.includes('\n')) {
        nodeType = 'p';
      } else {
        nodeType = 'span';
      }
      content = node.characters;
    } else if (isImageNode(node)) {
      nodeType = 'img';
      const result = await getNodeAssetPath(node);
      assetPath = result || undefined; // Convert null to undefined
    }
    
    // Store or update node info
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        node,
        type: nodeType,
        styles: {},
        originalStyles: {},  // Add storage for original styles
        name: semanticName,
        content: {},
        assetPath,
        variants: {}
      });
    }
    
    // Update node info for this variant
    const nodeInfo = nodeMap.get(nodeId);
    nodeInfo.styles[variantKey] = tailwindClasses;
    nodeInfo.originalStyles = nodeInfo.originalStyles || {};
    nodeInfo.originalStyles[variantKey] = styles;  // Store original style information for token mapping
    
    if (content !== undefined) {
      if (!nodeInfo.content) {
        nodeInfo.content = {};
      }
      nodeInfo.content[variantKey] = content;
    }
    nodeInfo.variants[variantKey] = true;
    
    // Process child nodes recursively
    if ('children' in node && node.children) {
      await processComponentChildren(node.children, variantKey, nodeMap, tokens, nodeId, level + 1);
    }
  }
}

/**
 * Build node structure from the node map
 */
export async function buildNodeStructure(
  nodeMap: Map<string, any>,
  variantProps: Record<string, string[]>
): Promise<ComponentStructureNode[]> {
  // Create a map to track node structures
  const nodeStructures = new Map<string, ComponentStructureNode>();
  const topLevelNodes: ComponentStructureNode[] = [];
  
  // Build nodes
  for (const [nodeId, nodeInfo] of nodeMap.entries()) {
    // Ensure cssName is a valid JS identifier
    const sanitizedName = sanitizeIdentifier(nodeInfo.name);
    
    // Create node structure
    const node: ComponentStructureNode = {
      id: nodeId,
      name: nodeInfo.name,
      type: nodeInfo.type,
      cssName: sanitizedName,
      children: [],
      present: {},
      styles: {}
    };
    
    // For component instances, add the componentName and props
    if (nodeInfo.type === 'component' && nodeInfo.componentName) {
      node.componentName = nodeInfo.componentName;
      node.componentProps = nodeInfo.props || [];
    }
    
    // Add variant-specific information
    for (const variantKey of Object.keys(nodeInfo.variants)) {
      node.present[variantKey] = true;
      
      // Add styles if available for this variant
      if (nodeInfo.styles && nodeInfo.styles[variantKey]) {
        if (!node.styles[variantKey]) {
          node.styles[variantKey] = {
            tailwindClasses: nodeInfo.styles[variantKey],
            originalStyles: nodeInfo.originalStyles?.[variantKey] || {}
          };
        }
      }
      
      // Add content if available for this variant
      if (nodeInfo.content && nodeInfo.content[variantKey]) {
        if (!node.content) node.content = {};
        node.content[variantKey] = nodeInfo.content[variantKey];
      }
    }
    
    // For images, add asset path
    if (nodeInfo.assetPath) {
      node.assetPath = nodeInfo.assetPath;
    }
    
    // Store in our map
    nodeStructures.set(nodeId, node);
  }
  
  // Build parent-child relationships
  for (const nodeId of nodeStructures.keys()) {
    const node = nodeStructures.get(nodeId)!;
    
    // Add to parent based on node ID structure (e.g., "parent_child")
    if (!nodeId.includes('_')) {
      // Top-level nodes
      topLevelNodes.push(node);
    } else {
      // Child nodes go under their parent
      const parentId = nodeId.substring(0, nodeId.lastIndexOf('_'));
      const parent = nodeStructures.get(parentId);
      if (parent) {
        parent.children.push(node);
        node.parent = parent;
      } else {
        // If parent not found, add to top level
        topLevelNodes.push(node);
      }
    }
  }
  
  return topLevelNodes;
}

/**
 * Helper function to extract image assets from nodes with image fills
 */
export async function extractImageAssets(node: SceneNode, styles: any): Promise<void> {
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