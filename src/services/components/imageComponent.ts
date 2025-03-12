/**
 * Check if a node is an image or has an image fill
 */
export function isImageNode(node: SceneNode): boolean {
  // Check if it's a direct image node type
  if (node.type === 'RECTANGLE' && node.name.toLowerCase().includes('image')) {
    return true;
  }
  
  // Check if it's a vector type that should be rendered as an image
  if (node.type === 'VECTOR' || node.type === 'STAR' || node.type === 'ELLIPSE') {
    return true;
  }
  
  // Check if it has image fills
  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    // Check if any fill is an image
    return node.fills.some(fill => fill.type === 'IMAGE' && fill.visible !== false);
  }
  
  return false;
}

/**
 * Determines the most likely file extension for an image node
 */
export function getImageFileExtension(node: SceneNode): string {
  // In a real implementation, you would determine this from node properties
  // or from user preferences
  
  // For now, use a simple approach based on node name
  const nodeName = node.name.toLowerCase();
  
  if (nodeName.includes('svg') || nodeName.includes('vector')) {
    return 'svg';
  } else if (nodeName.includes('jpg') || nodeName.includes('jpeg')) {
    return 'jpg';
  } else if (nodeName.includes('gif')) {
    return 'gif';
  } else if (nodeName.includes('webp')) {
    return 'webp';
  } else {
    // Default to PNG for most images
    return 'png';
  }
}

/**
 * Generate an image component from a node
 */
export function generateImageComponent(node: SceneNode, tailwindClasses: string): string {
  // Get alt text from node name or use a default
  const altText = node.name.replace(/^\d+\s*/, '').trim(); // Remove leading numbers and trim
  
  // Extract image source - in a real implementation, this would 
  // download the image asset and return a path
  const imageName = node.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const fileExtension = getImageFileExtension(node);
  
  // For images with long alt text or many classes, use multi-attribute format
  if (altText.length > 30 || tailwindClasses.length > 30) {
    return `<img 
  id="${node.name}"
  src={require('assets/${imageName}.${fileExtension}')}
  alt="${altText}"
  className="${tailwindClasses}"
  loading="lazy"
/>`;
  }
  
  // For simpler images, use inline format
  return `<img src={require('assets/${imageName}.${fileExtension}')} alt="${altText}" className="${tailwindClasses}" loading="lazy" />`;
} 