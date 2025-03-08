/*
 * diffUtils.ts
 *
 * This module provides utility functions to diff two text contents and compare variant render outputs.
 */

export interface DiffPart {
  text: string;
  operation: "added" | "removed" | "unchanged";
}

/**
 * Diff two strings line by line using a basic algorithm.
 * Lines that are equal are marked as "unchanged".
 * Lines that exist only in the old string are marked as "removed".
 * Lines that exist only in the new string are marked as "added".
 * 
 * @param oldStr The baseline string.
 * @param newStr The modified string.
 * @returns An array of DiffPart objects representing the differences.
 */
export function diffStrings(oldStr: string, newStr: string): DiffPart[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const diff: DiffPart[] = [];
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";
    if (oldLine === newLine) {
      diff.push({ text: oldLine, operation: "unchanged" });
    } else {
      if (oldLine) {
        diff.push({ text: `- ${oldLine}`, operation: "removed" });
      }
      if (newLine) {
        diff.push({ text: `+ ${newLine}`, operation: "added" });
      }
    }
  }
  return diff;
}

export interface ClassesDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export function diffTailwindClasses(oldClasses: string, newClasses: string): ClassesDiff {
  const oldArray = oldClasses.split(/\s+/).filter(Boolean);
  const newArray = newClasses.split(/\s+/).filter(Boolean);
  const added = newArray.filter(cls => !oldArray.includes(cls));
  const removed = oldArray.filter(cls => !newArray.includes(cls));
  const unchanged = oldArray.filter(cls => newArray.includes(cls));
  return { added, removed, unchanged };
}

export interface VariantSlotDiff {
  slot: string;
  diff: ClassesDiff;
}

export interface VariantDiff {
  variantKey: string;
  slotDiffs: VariantSlotDiff[];
}

/**
 * Computes the diff of a single slot configuration in a variant.
 * oldConfig and newConfig are tailwind class strings.
 */
export function diffVariantSlot(oldConfig: string, newConfig: string): ClassesDiff {
  return diffTailwindClasses(oldConfig, newConfig);
}

/**
 * Computes the diffs for all slots in a variant option.
 * For a variant option (like "Icon+Not Parking"), it compares each slot (base, icon, text, rightIcon) and returns diffs.
 */
export function diffVariantOption(
  oldOption: Record<string, string>, 
  newOption: Record<string, string>
): VariantSlotDiff[] {
  const slots = new Set([...Object.keys(oldOption || {}), ...Object.keys(newOption || {})]);
  const slotDiffs: VariantSlotDiff[] = [];
  slots.forEach(slot => {
    const oldSlot = oldOption[slot] || '';
    const newSlot = newOption[slot] || '';
    const slotDiff = diffVariantSlot(oldSlot, newSlot);
    if (slotDiff.added.length > 0 || slotDiff.removed.length > 0) {
      slotDiffs.push({
        slot,
        diff: slotDiff
      });
    }
  });
  return slotDiffs;
}

/**
 * Computes the diffs between two sets of variant configurations.
 * oldVariants and newVariants are objects where keys are variant option keys (e.g., "Icon+Not Parking") and values are slot configurations.
 */
export function diffVariants(
  oldVariants: Record<string, Record<string, string>>, 
  newVariants: Record<string, Record<string, string>>
): VariantDiff[] {
  const diffs: VariantDiff[] = [];
  const allKeys = new Set([...Object.keys(oldVariants), ...Object.keys(newVariants)]);
  allKeys.forEach(key => {
    const oldOption = oldVariants[key] || {};
    const newOption = newVariants[key] || {};
    const slotDiffs = diffVariantOption(oldOption, newOption);
    if (slotDiffs.length > 0) {
      diffs.push({
        variantKey: key,
        slotDiffs
      });
    }
  });
  return diffs;
}

/**
 * Interface representing a change in a JSX element
 */
export interface JSXElementChange {
  path: string;              // Path to the element (e.g., "0.children.1.className")
  oldValue: string | null;   // Old value (null if element was added)
  newValue: string | null;   // New value (null if element was removed)
  type: "added" | "removed" | "changed" | "unchanged";
}

/**
 * Interface to represent differences in JSX structure between variants
 */
export interface JSXDiff {
  elementChanges: JSXElementChange[];
  addedElements: string[];    // Paths to elements that were added
  removedElements: string[];  // Paths to elements that were removed
  changedElements: string[];  // Paths to elements that were changed
}

/**
 * Extract className values from a JSX string
 * @param jsxString The JSX content as a string
 * @returns Array of objects with the className and its location in the JSX
 */
export function extractClassNames(jsxString: string): Array<{ className: string, index: number, elementPath: string }> {
  const classNameRegex = /className="([^"]*)"/g;
  const results: Array<{ className: string, index: number, elementPath: string }> = [];
  let match;
  let elementIndex = 0;
  let elementPath = "";
  
  // Count opening and closing tags to track element paths
  const lines = jsxString.split('\n');
  let depth = 0;
  let currentPath: string[] = [];
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    // Update element path based on tag structure
    const openTags = (line.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (line.match(/<\/[^>]*>/g) || []).length;
    
    if (openTags > 0) {
      for (let i = 0; i < openTags; i++) {
        currentPath.push(depth.toString());
        depth++;
      }
    }
    
    // Extract classNames in this line
    const lineStart = jsxString.indexOf(line);
    let lineMatch;
    const lineClassRegex = /className="([^"]*)"/g;
    
    while ((lineMatch = lineClassRegex.exec(line)) !== null) {
      results.push({
        className: lineMatch[1],
        index: lineStart + lineMatch.index,
        elementPath: currentPath.join('.') || '0'
      });
    }
    
    // Adjust path after processing the line
    if (closeTags > 0) {
      for (let i = 0; i < closeTags; i++) {
        currentPath.pop();
        depth = Math.max(0, depth - 1);
      }
    }
  }
  
  return results;
}

/**
 * Compare two JSX renders and detect differences
 * @param baseJSX The base JSX content
 * @param variantJSX The variant JSX content to compare against the base
 * @returns JSXDiff object containing the differences
 */
export function diffJSX(baseJSX: string, variantJSX: string): JSXDiff {
  // Extract classNames from both JSXs
  const baseClasses = extractClassNames(baseJSX);
  const variantClasses = extractClassNames(variantJSX);
  
  const elementChanges: JSXElementChange[] = [];
  const addedElements: string[] = [];
  const removedElements: string[] = [];
  const changedElements: string[] = [];
  
  // Create maps of paths to classNames for easier comparison
  const baseMap = new Map(baseClasses.map(item => [item.elementPath, item.className]));
  const variantMap = new Map(variantClasses.map(item => [item.elementPath, item.className]));
  
  // Find all unique paths
  const allPaths = new Set([...baseMap.keys(), ...variantMap.keys()]);
  
  // Compare each path
  allPaths.forEach(path => {
    const baseClass = baseMap.get(path);
    const variantClass = variantMap.get(path);
    
    if (baseClass && variantClass) {
      if (baseClass !== variantClass) {
        elementChanges.push({
          path,
          oldValue: baseClass,
          newValue: variantClass,
          type: "changed"
        });
        changedElements.push(path);
      }
    } else if (baseClass) {
      elementChanges.push({
        path,
        oldValue: baseClass,
        newValue: null,
        type: "removed"
      });
      removedElements.push(path);
    } else if (variantClass) {
      elementChanges.push({
        path,
        oldValue: null,
        newValue: variantClass,
        type: "added"
      });
      addedElements.push(path);
    }
  });
  
  return {
    elementChanges,
    addedElements,
    removedElements,
    changedElements
  };
}

/**
 * Find potential parameters from variant differences
 * This function identifies common patterns in className changes that could be parameterized
 */
export function identifyParameters(diffs: JSXDiff[]): Record<string, string[]> {
  const parameterMap: Record<string, Set<string>> = {};
  
  diffs.forEach(diff => {
    diff.elementChanges
      .filter(change => change.type === "changed")
      .forEach(change => {
        if (change.oldValue && change.newValue) {
          const oldClasses = change.oldValue.split(/\s+/).filter(Boolean);
          const newClasses = change.newValue.split(/\s+/).filter(Boolean);
          
          // Find classes that were added or removed
          const diff = diffTailwindClasses(change.oldValue, change.newValue);
          
          // For each change, create a potential parameter
          if (diff.added.length > 0 || diff.removed.length > 0) {
            const paramName = `param_${change.path.replace(/\./g, '_')}`;
            if (!parameterMap[paramName]) {
              parameterMap[paramName] = new Set();
            }
            
            // Store the pattern of what changed
            const changePattern = JSON.stringify({
              added: diff.added,
              removed: diff.removed
            });
            parameterMap[paramName].add(changePattern);
          }
        }
      });
  });
  
  // Convert sets to arrays for the result
  const result: Record<string, string[]> = {};
  Object.keys(parameterMap).forEach(key => {
    result[key] = Array.from(parameterMap[key]);
  });
  
  return result;
}

/**
 * Analyze variant renders to find what changed and create parameterized transformations
 * @param variantRenders Object with variant names as keys and JSX strings as values
 * @returns Analysis of differences and potential parameters
 */
export function analyzeVariantRenders(
  variantRenders: Record<string, string>
): {
  diffs: Record<string, JSXDiff>,
  parameters: Record<string, string[]>
} {
  const variants = Object.keys(variantRenders);
  if (variants.length <= 1) {
    return { diffs: {}, parameters: {} };
  }
  
  // Use first variant as baseline
  const baseVariant = variants[0];
  const baseRender = variantRenders[baseVariant];
  
  // Compare each other variant to the baseline
  const diffs: Record<string, JSXDiff> = {};
  for (let i = 1; i < variants.length; i++) {
    const variantName = variants[i];
    const variantRender = variantRenders[variantName];
    diffs[variantName] = diffJSX(baseRender, variantRender);
  }
  
  // Identify potential parameters from the diffs
  const parameters = identifyParameters(Object.values(diffs));
  
  return { diffs, parameters };
}

/**
 * Generates a parameterized component template based on variant analysis
 * @param baseRender The baseline render JSX
 * @param parameters The identified parameters from variant analysis
 * @returns JSX content with parameterized className values
 */
export function generateParameterizedTemplate(
  baseRender: string,
  diffs: Record<string, JSXDiff>
): string {
  let template = baseRender;
  
  // Get class positions in the template
  const classPositions = extractClassNames(template);
  
  // Build a map of elements that change across variants
  const changedPaths = new Set<string>();
  Object.values(diffs).forEach(diff => {
    diff.changedElements.forEach(path => changedPaths.add(path));
  });
  
  // Sort positions in reverse order to avoid index shifting when replacing
  const sortedPositions = classPositions
    .filter(pos => changedPaths.has(pos.elementPath))
    .sort((a, b) => b.index - a.index);
  
  // Replace static classNames with dynamic ones
  for (const position of sortedPositions) {
    const { className, index, elementPath } = position;
    const paramName = `param_${elementPath.replace(/\./g, '_')}`;
    
    // Check if this element has different classes in different variants
    if (changedPaths.has(elementPath)) {
      // Replace with dynamic className
      const staticPart = JSON.stringify(className);
      const dynamicPart = `\${${paramName} || ''}`;
      
      // Replace in the template
      const beforeClass = template.substring(0, index);
      const afterClass = template.substring(index + 9 + className.length); // 9 = length of 'className="'
      template = `${beforeClass}className={${staticPart} + ${dynamicPart}${afterClass}`;
    }
  }
  
  return template;
} 