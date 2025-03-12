/**
 * @file nameUtils.ts
 * This file contains utility functions for working with names and identifiers
 * in the component generation process.
 */

import { isImageNode } from '../components/imageComponent';
import { generateComponentName as generateName } from '../../utils/nameUtils';

/**
 * Export the imported function directly
 */
export const generateComponentName = generateName;

/**
 * Generate a semantic name for a node based on its properties
 * Ensures the name is a valid JavaScript identifier
 */
export function generateSemanticName(node: SceneNode, index: number, level: number): string {
  let name = '';
  
  // Try to generate a name from node name
  if (node.name) {
    // Remove any instance numbers or common prefixes
    const cleanName = node.name
      .replace(/\s*\d+$/, '')
      .replace(/^Frame\s+/i, '')
      .replace(/^Group\s+/i, '')
      .replace(/^Rectangle\s+/i, '')
      .trim();
    
    if (cleanName) {
      // Convert to camelCase, removing any non-alphanumeric characters
      name = cleanName
        .toLowerCase()
        .split(/\s+/)
        .map((word, idx) => {
          // Remove non-alphanumeric characters
          const safeWord = word.replace(/[^a-z0-9]/g, '');
          return idx === 0 ? safeWord : safeWord.charAt(0).toUpperCase() + safeWord.slice(1);
        })
        .join('');
    }
  }
  
  // If we couldn't generate a valid name, use fallbacks
  if (!name || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    // Fallback based on node type
    if (node.type === 'TEXT') {
      // Use first few characters of text content, sanitized
      if ('characters' in node && node.characters) {
        name = node.characters.substring(0, 20)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
      }
    } 
    
    // If still no valid name, use type-based fallbacks
    if (!name || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      if (isImageNode(node)) {
        name = `image_${index}`;
      } else if (node.type === 'RECTANGLE') {
        name = `box_${index}`;
      } else if (node.type === 'ELLIPSE') {
        name = `circle_${index}`;
      } else if (node.type === 'FRAME') {
        name = `container_${index}`;
      } else if (node.type === 'GROUP') {
        name = `group_${index}`;
      } else {
        name = `element_${index}`;
      }
    }
  }
  
  // Final validation to ensure we have a valid JS identifier
  // If not valid, fall back to a safe default
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    name = `element_${index}`;
  }
  
  return name;
}

/**
 * Sanitize a string to make it a valid JavaScript identifier
 */
export function sanitizeIdentifier(name: string): string {
  // First replace dots with underscores to handle prop names like "dyn._isl._size"
  let sanitized = name.replace(/\./g, '_');
  
  // Then remove any other non-alphanumeric characters except underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  // If empty after sanitization, use a default
  if (!sanitized) {
    sanitized = 'element';
  }
  
  return sanitized;
} 