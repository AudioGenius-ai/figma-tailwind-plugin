import { extractStyles } from './styleExtractor';
import { stylesToTailwind } from '../transformers/stylesToTailwind';
import { generateComponentName } from '../utils/nameUtils';
import { DesignTokens } from '../types/designTokenTypes';
import { styleNameToVariable } from '../utils/nameUtils';

// Helper to generate position styles
function getPositionStyles(node: SceneNode): string {
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

// Helper to format component code with proper indentation
function formatCode(code: string, indent: number = 0): string {
  if (!code) return '';
  
  const indentStr = ' '.repeat(indent);
  const lines = code.split('\n');
  
  return lines.map(line => {
    // Keep empty lines as empty (without indentation)
    if (line.trim() === '') return '';
    // For non-empty lines, apply indentation
    return `${indentStr}${line.trim()}`;
  }).join('\n');
}

// Helper to clean up Tailwind classes
function cleanupTailwindClasses(classes: string): string {
  if (!classes) return '';
  
  // Map of categories with their prefixes
  const categories = {
    backgroundColor: ['bg-'],
    textColor: ['text-'],
    width: ['w-'],
    height: ['h-'],
    margin: ['m-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-'],
    padding: ['p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-'],
    display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid'],
    position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
    flexDirection: ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
    justifyContent: ['justify-'],
    alignItems: ['items-'],
    borderRadius: ['rounded', 'rounded-'],
    borderWidth: ['border', 'border-'],
    borderColor: ['border-'],
    fontSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'],
    fontWeight: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
    overflow: ['overflow-'],
    gap: ['gap-']
  };
  
  // Utility to check if a class belongs to a category
  const getCategory = (cls: string): string | null => {
    for (const [category, prefixes] of Object.entries(categories)) {
      for (const prefix of prefixes) {
        if (cls === prefix || cls.startsWith(prefix)) {
          return category;
        }
      }
    }
    return null;
  };
  
  // Check if this is likely a button component
  const isButton = classes.includes('rounded') && 
                  (classes.includes('justify-center') || classes.includes('items-center')) &&
                  classes.includes('flex');
  
  // If it's a button and doesn't have a background color, add the primary color
  let hasBgColor = false;
  
  // Keep track of seen categories to avoid duplicates
  const appliedCategories = new Set<string>();
  const uniqueClasses: string[] = [];
  
  // Process classes in reverse order (last one wins for conflicting classes)
  classes.split(/\s+/).filter(Boolean).reverse().forEach(cls => {
    // Special case for common colors
    if (cls === 'bg-[#ffffff]' || cls === 'bg-[rgb(255,255,255)]' || cls === 'bg-[rgb(255, 255, 255)]') {
      cls = 'bg-white';
    } else if (cls === 'bg-[#000000]' || cls === 'bg-[rgb(0,0,0)]' || cls === 'bg-[rgb(0, 0, 0)]') {
      cls = 'bg-black';
    }
    
    // Track if we have a background color
    if (cls.startsWith('bg-')) {
      hasBgColor = true;
    }
    
    // Check if this class belongs to a category we've already seen
    const category = getCategory(cls);
    if (category && !appliedCategories.has(category)) {
      // Remember that we've applied this category
      appliedCategories.add(category);
      // Add to unique classes
      uniqueClasses.unshift(cls); // Add to beginning since we're processing in reverse
    } else if (!category) {
      // For classes that don't belong to a known category
      uniqueClasses.unshift(cls);
    }
  });
  
  // Add primary background for buttons if needed
  if (isButton && !hasBgColor) {
    uniqueClasses.push('bg-primary-500');
  }
  
  return uniqueClasses.join(' ');
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper to check if a node and all its parents are visible
function isNodeVisible(node: SceneNode): boolean {
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

// Helper to get node bounds accounting for all rendered properties
function getNodeBounds(node: SceneNode): Bounds | undefined {
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

// Helper to check if a node is outside given bounds
function isNodeOutsideBounds(node: SceneNode, bounds: Bounds): boolean {
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

// Helper to get component props
function getComponentProps(node: SceneNode): string[] {
  const props: string[] = [];
  
  // Add component properties
  if ('componentProperties' in node && node.componentProperties) {
    Object.entries(node.componentProperties).forEach(([key, value]) => {
      // Handle different types of property values
      if (typeof value === 'string') {
        props.push(`${key}="${value}"`);
      } else if (typeof value === 'boolean') {
        if (value) {
          props.push(key);
        }
      }
    });
  }

  // Add variant properties
  if ('variantProperties' in node && node.variantProperties) {
    Object.entries(node.variantProperties).forEach(([key, value]) => {
      props.push(`${key.split(' ').join('_').toLowerCase()}="${value}"`);
    });
  }

  return props;
}

// Helper to get the component set for a node
async function getComponentSet(node: SceneNode): Promise<ComponentSetNode | null> {
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

// Get all unique variant props from a component set
function getVariantPropsFromComponentSet(componentSet: ComponentSetNode): Record<string, string[]> {
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

// Generate a map of variant combinations to component children
async function generateVariantMap(
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
  console.log('Component name:', componentName);
  const styles = await extractStyles(node);
  console.log('Styles:', styles);

  const tailwindClasses = cleanupTailwindClasses(stylesToTailwind(styles, tokens));
  console.log('Tailwind classes:', tailwindClasses);
  
  let childComponents = '';
  let childContent = '';
  
  // Handle children
  if ('children' in node && node.children) {
    const childBounds = getNodeBounds(node);
    
    for (const child of node.children) {
      console.log('Processing child:', child.name, child.type, child);
      if (child.type === 'INSTANCE') {

          const mainComponent = await child.getMainComponentAsync();
          console.log('Main component:', child.name, child.type, child.parent?.type);
          if (mainComponent) {
            // Extract the base component name - take the part before any comma
            // which usually separates the component name from its variants
            const baseComponentName = child.name.split(',')[0].trim();
            const instanceComponentName = generateComponentName(baseComponentName);
            
            // Extract variant properties from the instance
            const props = getComponentProps(child);
            const propsString = props.length > 0 ? ` ${props.join(' ')}` : '';
            
            console.log('Instance component name:', baseComponentName, '->', instanceComponentName);
            childContent += formatCode(`<${instanceComponentName}${propsString} />`, 6) + '\n';
          } else {
            console.log('No main component found for instance:', child.name);
            childContent += await generateComponentBody(child, tokens);
          }
    
      } else if (child.type === 'COMPONENT' || child.type === 'COMPONENT_SET') {
        // Only generate component if it's not part of a component set
        if (child.parent?.type !== 'COMPONENT_SET') {
          childComponents += await generateReactComponent(child, tokens, false, childBounds) + '\n\n';
          const props = getComponentProps(child);
          const propsString = props.length > 0 ? ` ${props.join(' ')}` : '';
          childContent += formatCode(`<${generateComponentName(child.name)}${propsString} />`, 6) + '\n';
        }
      } else {
        // Handle regular node
        childContent += await generateComponentBody(child, tokens);
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
    // Format the child content properly
    const formattedChildContent = childContent.trim();
    
    // Get any props that should be passed to this component
    const props = getComponentProps(node);
    const propsDeclaration = props.length > 0 ? 
      `{ ${props.map(p => p.includes('=') ? p.split('=')[0] : p).join(', ')} }` : 
      '';
    
    // Root/Component nodes should be relative positioned containers
    component = [
      `function ${componentName}(${propsDeclaration}) {`,
      `  return (`,
      `    <div className="relative ${tailwindClasses}">`,
      formattedChildContent,
      `    </div>`,
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

// Generate a component with variant handling
async function generateComponentWithVariants(
  componentSet: ComponentSetNode,
  tokens: DesignTokens,
  parentBounds?: Bounds
): Promise<string> {
  const componentName = generateComponentName(componentSet.name);
  
  // Get all variant properties for this component set
  const variantProps = getVariantPropsFromComponentSet(componentSet);
  
  // Get variant map (mapping from variant combinations to component content)
  const variantMap = await generateVariantMap(componentSet, tokens, parentBounds);
  
  // Extract common styles that should apply to base component
  const baseStyles = await extractStyles(componentSet);
  let baseClassNames = cleanupTailwindClasses(stylesToTailwind(baseStyles, tokens));
  
  // Fix invalid Tailwind syntax and make styles more responsive
  baseClassNames = baseClassNames
    .replace(/w-\[\d+px\]/g, 'w-full')
    .replace(/h-\[\d+px\]/g, 'h-auto')
    .replace(/border-\[(.*?)\]/g, (match, p1) => {
      // Fix border syntax: border-[1px solid #color] -> border border-solid border-color
      if (p1.includes('solid')) {
        const parts = p1.split(' ');
        if (parts.length === 3) {
          const width = parts[0].replace('px', '');
          const style = parts[1];
          const color = parts[2].replace('#', '');
          return `border-${width} border-${style} border-[#${color}]`;
        }
      }
      return match;
    });
  
  // Split base class into array for better readability as per tailwind-variants docs
  const baseClassArray = baseClassNames.split(' ').filter(Boolean).map(cls => `'${cls}'`);
  
  // Create the props declaration
  const propsString = Object.keys(variantProps).map(key => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    return `${formattedKey}`;
  }).join(', ');
  
  const propsDeclaration = propsString ? `{ ${propsString}, className }` : '{ className }';
  
  // Determine if we should use slots based on the complexity of the component
  const shouldUseSlots = Object.keys(variantMap).some(key => 
    variantMap[key].includes('<div') && 
    variantMap[key].includes('</div>') && 
    variantMap[key].includes('<span')
  );
  
  // Generate compound variants for combinations that need special treatment
  let compoundVariants = [];
  
  // Check for special combinations (e.g., size+state that need specific styling)
  if (Object.keys(variantProps).length > 1) {
    const firstKey = Object.keys(variantProps)[0].split(' ').join('_').toLowerCase();
    const secondKey = Object.keys(variantProps)[1].split(' ').join('_').toLowerCase();
    
    // Example: When size is large and state is focus, add specific styling
    if (firstKey === 'size' && secondKey === 'state') {
      compoundVariants.push({
        size: 'Large',
        state: 'Focus',
        class: 'ring-offset-4' // Example of additional style for this combination
      });
    }
  }
  
  // Generate variants definition
  let variantsCode;
  
  if (shouldUseSlots) {
    // Use slots for complex components with multiple elements
    variantsCode = generateSlotsVariants(variantProps, variantMap);
  } else {
    // Use regular variants
    variantsCode = generateRegularVariants(variantProps);
  }
  
  // Create optimized variant content mapping
  const uniqueContents = new Map<string, string>();
  
  Object.entries(variantMap).forEach(([variantKey, content]) => {
    uniqueContents.set(content, variantKey);
  });
  
  // Generate functions to render each unique content variation
  const contentRenderFunctions = Array.from(uniqueContents.entries()).map(([content, variantKey], index) => {
    const functionName = `render_content_${index}`;
    
    return `  const ${functionName} = () => (\n    <>\n${content.split('\n').map(line => `      ${line}`).join('\n')}\n    </>\n  );`;
  }).join('\n\n');
  
  // Generate the variant rendering logic
  let renderLogic = '';
  
  const variantPropTypes = Object.entries(variantProps).map(([key, values]) => {
    return `  // ${key} can be: ${values.join(', ')}`;
  }).join('\n');
  
  const firstVariantKey = Object.keys(variantProps)[0]?.split(' ').join('_').toLowerCase();
  const secondVariantKey = Object.keys(variantProps)[1]?.split(' ').join('_').toLowerCase();
  
  if (firstVariantKey) {
    renderLogic = `${variantPropTypes}\n  // Map variant combinations to content functions\n  const contentMap = {`;
    
    // For each variant combination, map to the correct render function
    Object.entries(variantMap).forEach(([variantKey, content]) => {
      // Find which function renders this content
      const functionIndex = Array.from(uniqueContents.entries())
        .findIndex(([c]) => c === content);
      
      // Create consistent, lowercase keys for the content map
      const parts = variantKey.split(':');
      let formattedKey = '';
      
      if (parts.length > 0 && parts[0].includes('=')) {
        const [key, value] = parts[0].split('=');
        formattedKey += `'${key.toLowerCase()}=${value}'`;
      }
      
      if (parts.length > 1 && parts[1].includes('=')) {
        const [key, value] = parts[1].split('=');
        formattedKey += `:'${key.toLowerCase()}=${value}'`;
      }
      
      if (functionIndex >= 0 && formattedKey) {
        renderLogic += `\n    ${formattedKey}: render_content_${functionIndex},`;
      }
    });
    
    renderLogic += `\n  };\n\n`;
    
    // Generate variant key names for reference
    renderLogic += `  // Create key from current props\n`;
    renderLogic += `  const getContentKey = () => {\n`;
    renderLogic += `    let key = '';\n`;
    
    if (firstVariantKey) {
      const firstPropName = Object.keys(variantProps)[0].toLowerCase();
      renderLogic += `    if (${firstVariantKey}) key += \`${firstPropName}=\${${firstVariantKey}}\`;\n`;
    }
    
    if (secondVariantKey) {
      const secondPropName = Object.keys(variantProps)[1].toLowerCase();
      renderLogic += `    if (${secondVariantKey}) key += \`:\${secondPropName}=\${${secondVariantKey}}\`;\n`;
    }
    
    renderLogic += `    return key;\n`;
    renderLogic += `  };\n\n`;
    
    renderLogic += `  // Get content based on current variant props\n`;
    renderLogic += `  const renderVariantContent = () => {\n`;
    renderLogic += `    const key = getContentKey();\n`;
    renderLogic += `    const ContentRenderer = contentMap[key] || (() => <></>);\n`;
    renderLogic += `    return <ContentRenderer />;\n`;
    renderLogic += `  };\n`;
  }
  
  // Construct the final component using tailwind-variants
  const component = [
    `import { tv } from 'tailwind-variants';`,
    ``,
    `// Define component variants using tailwind-variants`,
    shouldUseSlots ? 
      generateSlotsComponent(componentName, baseClassArray, variantsCode, variantProps, contentRenderFunctions, renderLogic) :
      generateRegularComponent(componentName, baseClassArray, variantsCode, compoundVariants, variantProps, contentRenderFunctions, renderLogic),
    ``,
    `export default ${componentName};`
  ].join('\n');
  
  return component;
}

// Helper to generate regular variants (non-slots)
function generateRegularVariants(variantProps: Record<string, string[]>) {
  return Object.entries(variantProps).map(([key, values]) => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    
    // Generate styles for each variant value
    const valueStyles = values.map(value => {
      // Extract specific styles for this variant combination
      let variantSpecificStyles = '';
      
      switch(formattedKey) {
        case 'size':
          if (value === 'large' || value === 'Large') {
            variantSpecificStyles = 'py-4 px-6 text-lg';
          } else if (value === 'medium' || value === 'Medium') {
            variantSpecificStyles = 'py-3 px-5 text-base';
          } else if (value === 'small' || value === 'Small' || value.includes('Input')) {
            variantSpecificStyles = 'py-2 px-4 text-sm';
          }
          break;
        case 'state':
          if (value === 'hover' || value === 'Hover') {
            variantSpecificStyles = 'opacity-90 hover:opacity-90';
          } else if (value === 'disabled' || value === 'Disabled') {
            variantSpecificStyles = 'opacity-50 cursor-not-allowed';
          } else if (value === 'pressed' || value === 'Pressed') {
            variantSpecificStyles = 'transform scale-95 active:scale-95';
          } else if (value === 'focus' || value === 'Focus') {
            variantSpecificStyles = 'ring-2 ring-offset-2 ring-primary focus:ring-2';
          }
          break;
        // Handle other variant types as needed
      }
      
      // Format as array of individual classes for better readability
      const classes = variantSpecificStyles.split(' ').filter(Boolean);
      if (classes.length > 0) {
        return `      "${value}": [${classes.map(c => `'${c}'`).join(', ')}],`;
      }
      return `      "${value}": '',`;
    });
    
    return `    ${formattedKey}: {\n${valueStyles.join('\n')}\n    },`;
  }).join('\n');
}

// Helper to generate slots-based variants
function generateSlotsVariants(variantProps: Record<string, string[]>, variantMap: Record<string, string>) {
  // First identify all the slots we need based on the content
  // This is a simplified approach - in a real scenario you'd need more complex parsing
  const exampleContent = Object.values(variantMap)[0] || '';
  const slots = ['base', 'icon', 'text', 'rightIcon'];
  
  let slotsCode = `  slots: {\n`;
  
  // Generate base slot
  slotsCode += `    base: 'flex items-center justify-center',\n`;
  slotsCode += `    icon: 'w-5 h-5 mr-2',\n`;
  slotsCode += `    text: 'font-medium',\n`;
  slotsCode += `    rightIcon: 'w-5 h-5 ml-2',\n`;
  slotsCode += `  },\n`;
  
  // Generate variants for each slot
  slotsCode += `  variants: {\n`;
  
  Object.entries(variantProps).forEach(([key, values]) => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    
    slotsCode += `    ${formattedKey}: {\n`;
    
    values.forEach(value => {
      slotsCode += `      "${value}": {\n`;
      
      // Base slot styles
      slotsCode += `        base: `;
      if (formattedKey === 'size') {
        if (value === 'Large') {
          slotsCode += `'p-4',\n`;
        } else if (value === 'Medium') {
          slotsCode += `'p-3',\n`;
        } else {
          slotsCode += `'p-2',\n`;
        }
      } else if (formattedKey === 'state') {
        if (value === 'Hover') {
          slotsCode += `'hover:opacity-90',\n`;
        } else if (value === 'Disabled') {
          slotsCode += `'opacity-50 cursor-not-allowed',\n`;
        } else if (value === 'Pressed') {
          slotsCode += `'active:scale-95',\n`;
        } else if (value === 'Focus') {
          slotsCode += `'focus:ring-2 focus:ring-offset-2',\n`;
        } else {
          slotsCode += `'',\n`;
        }
      } else {
        slotsCode += `'',\n`;
      }
      
      // Icon slot styles
      slotsCode += `        icon: `;
      if (formattedKey === 'size') {
        if (value === 'Large') {
          slotsCode += `'w-6 h-6',\n`;
        } else if (value === 'Medium') {
          slotsCode += `'w-5 h-5',\n`;
        } else {
          slotsCode += `'w-4 h-4',\n`;
        }
      } else {
        slotsCode += `'',\n`;
      }
      
      // Text slot styles
      slotsCode += `        text: `;
      if (formattedKey === 'size') {
        if (value === 'Large') {
          slotsCode += `'text-lg',\n`;
        } else if (value === 'Medium') {
          slotsCode += `'text-base',\n`;
        } else {
          slotsCode += `'text-sm',\n`;
        }
      } else if (formattedKey === 'state' && value === 'Disabled') {
        slotsCode += `'text-opacity-60',\n`;
      } else {
        slotsCode += `'',\n`;
      }
      
      // Right icon slot styles
      slotsCode += `        rightIcon: `;
      if (formattedKey === 'size') {
        if (value === 'Large') {
          slotsCode += `'w-6 h-6',\n`;
        } else if (value === 'Medium') {
          slotsCode += `'w-5 h-5',\n`;
        } else {
          slotsCode += `'w-4 h-4',\n`;
        }
      } else {
        slotsCode += `'',\n`;
      }
      
      slotsCode += `      },\n`;
    });
    
    slotsCode += `    },\n`;
  });
  
  slotsCode += `  },\n`;
  
  return slotsCode;
}

// Helper to generate a component with slots
function generateSlotsComponent(
  componentName: string, 
  baseClassArray: string[], 
  slotsCode: string,
  variantProps: Record<string, string[]>,
  contentRenderFunctions: string,
  renderLogic: string
) {
  const lowerName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
  
  // Prepare slots component
  let code = `const ${lowerName} = tv({\n`;
  code += `  base: [\n    ${baseClassArray.join(',\n    ')}\n  ],\n`;
  code += slotsCode;
  
  // Default variants
  code += `  defaultVariants: {\n`;
  Object.entries(variantProps).forEach(([key, values]) => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    const defaultValue = values[0] || '';
    code += `    ${formattedKey}: "${defaultValue}",\n`;
  });
  code += `  }\n`;
  code += `});\n\n`;
  
  // Component function
  code += `function ${componentName}({ ${Object.keys(variantProps).map(key => 
    key.split(' ').join('_').toLowerCase()).join(', ')}, className }) {\n`;
  
  // Add content render functions
  if (contentRenderFunctions) {
    code += contentRenderFunctions + '\n\n';
  }
  
  // Add render logic if any
  if (renderLogic) {
    code += renderLogic + '\n';
  }
  
  // Destructure slots
  code += `  // Compute variant classes\n`;
  code += `  const { base, icon, text, rightIcon } = ${lowerName}({\n`;
  Object.keys(variantProps).forEach(key => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    code += `    ${formattedKey},\n`;
  });
  code += `    className,\n`;
  code += `  });\n\n`;
  
  // Return component with slots
  code += `  return (\n`;
  code += `    <div className={base()}>\n`;
  
  if (renderLogic) {
    code += `      {renderVariantContent()}\n`;
  } else {
    code += `      <span className={icon()}></span>\n`;
    code += `      <span className={text()}>Label</span>\n`;
    code += `      <span className={rightIcon()}></span>\n`;
  }
  
  code += `    </div>\n`;
  code += `  );\n`;
  code += `}`;
  
  return code;
}

// Helper to generate a regular component (non-slots)
function generateRegularComponent(
  componentName: string, 
  baseClassArray: string[], 
  variantsCode: string,
  compoundVariants: any[],
  variantProps: Record<string, string[]>,
  contentRenderFunctions: string,
  renderLogic: string
) {
  const lowerName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
  
  // Prepare regular component
  let code = `const ${lowerName}Variants = tv({\n`;
  code += `  base: [\n    ${baseClassArray.join(',\n    ')}\n  ],\n`;
  code += `  variants: {\n${variantsCode}\n  },\n`;
  
  // Add compound variants if any
  if (compoundVariants.length > 0) {
    code += `  compoundVariants: [\n`;
    compoundVariants.forEach(variant => {
      code += `    {\n`;
      Object.entries(variant).forEach(([key, value]) => {
        if (key !== 'class') {
          code += `      ${key}: "${value}",\n`;
        }
      });
      code += `      class: "${variant.class}",\n`;
      code += `    },\n`;
    });
    code += `  ],\n`;
  }
  
  // Default variants
  code += `  defaultVariants: {\n`;
  Object.entries(variantProps).forEach(([key, values]) => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    const defaultValue = values[0] || '';
    code += `    ${formattedKey}: "${defaultValue}",\n`;
  });
  code += `  }\n`;
  code += `});\n\n`;
  
  // Component function
  code += `function ${componentName}({ ${Object.keys(variantProps).map(key => 
    key.split(' ').join('_').toLowerCase()).join(', ')}, className }) {\n`;
  
  // Add content render functions
  if (contentRenderFunctions) {
    code += contentRenderFunctions + '\n\n';
  }
  
  // Add render logic if any
  if (renderLogic) {
    code += renderLogic + '\n';
  }
  
  // Compute variant classes
  code += `  // Compute variant classes\n`;
  code += `  const variantStyles = ${lowerName}Variants({\n`;
  Object.keys(variantProps).forEach(key => {
    const formattedKey = key.split(' ').join('_').toLowerCase();
    code += `    ${formattedKey},\n`;
  });
  code += `    className,\n`;
  code += `  });\n\n`;
  
  // Return component
  code += `  return (\n`;
  code += `    <div className={variantStyles}>\n`;
  
  if (renderLogic) {
    code += `      {renderVariantContent()}\n`;
  } else {
    code += `      {/* Base Component */}\n`;
  }
  
  code += `    </div>\n`;
  code += `  );\n`;
  code += `}`;
  
  return code;
}

/**
 * Determines if a node is likely to be an image based on its properties
 */
function isImageNode(node: SceneNode): boolean {
  if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
    // Check if the node has fills that are of type IMAGE
    if ('fills' in node && Array.isArray(node.fills)) {
      return node.fills.some(fill => fill.type === 'IMAGE' && fill.visible !== false);
    }
  }
  return false;
}

/**
 * Determines the most likely file extension for an image node
 */
function getImageFileExtension(node: SceneNode): string {
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
 * Generates an image component with proper src attribute
 */
function generateImageComponent(node: SceneNode, tailwindClasses: string): string {
  const nodeName = node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const fileExtension = getImageFileExtension(node);
  
  // Generate appropriate image source using require syntax
  const imageSrc = `{require('assets/${nodeName}.${fileExtension}')}`;
  
  // Add responsive image classes if not already present
  if (!tailwindClasses.includes('w-') && !tailwindClasses.includes('max-w-')) {
    tailwindClasses += ' max-w-full';
  }
  
  if (!tailwindClasses.includes('h-')) {
    tailwindClasses += ' h-auto';
  }
  
  // Add loading="lazy" for better performance
  return `<img 
  src=${imageSrc} 
  alt="${node.name}" 
  className="${tailwindClasses.trim()}" 
  loading="lazy" 
/>\n`;
}

/**
 * Attempts to extract SVG content from a Figma node when possible
 */
async function extractSvgFromNode(node: SceneNode): Promise<string | null> {
  try {
    // Handle different vector types
    if (node.type === 'VECTOR' || node.type === 'LINE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'ELLIPSE') {
      let pathData = '';
      
      // Check if this is an instance of a vector component
      if ('mainComponent' in node && node.mainComponent) {
        // For vector instances, we should just render a reference to the component
        // Use type assertion to correctly type the mainComponent
        const mainComponentName = (node.mainComponent as ComponentNode).name || 'unnamed';
        console.log(`Vector instance found: ${node.name}, referencing main component: ${mainComponentName}`);
        return null; // We'll handle this in the parent component
      }
      
      // Handle different vector shapes based on their actual geometry
      switch(node.type) {
        case 'ELLIPSE':
          pathData = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z';
          break;
        case 'LINE':
          pathData = 'M2 12h20';
          break;
        case 'POLYGON':
          pathData = 'M12 2 L22 12 L12 22 L2 12 Z';
          break;
        case 'STAR':
          pathData = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
          break;
        default:
          // Try to get actual vector data if possible
          if ('vectorPaths' in node && node.vectorPaths && node.vectorPaths.length > 0) {
            const vectorPath = node.vectorPaths[0];
            pathData = vectorPath.data || '';
          } else {
            pathData = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z';
          }
      }
      
      return pathData ? `<path d="${pathData}" />` : null;
    } else if (node.type === 'GROUP') {
      // For groups of vectors, try to process each child
      if ('children' in node && node.children) {
        const svgParts: string[] = [];
        for (const child of node.children) {
          const childSvg = await extractSvgFromNode(child);
          if (childSvg) {
            svgParts.push(childSvg);
          }
        }
        return svgParts.join('\n  ');
      }
    } else if (node.type === 'INSTANCE' && 'mainComponent' in node) {
      // For instances, check if mainComponent exists
      if (node.mainComponent) {
        // Use type assertion for mainComponent
        const mainComponent = node.mainComponent as ComponentNode;
        console.log(`Instance found: ${node.name}, referencing main component: ${mainComponent.name}`);
        
        // Check if this is an icon/vector component
        if (mainComponent.name.toLowerCase().includes('icon') || 
            mainComponent.children?.some(child => child.type === 'VECTOR')) {
          return null; // We'll reference the component instead
        }
        
        // Otherwise try to extract SVG content from the instance itself
        if ('children' in node && node.children) {
          const svgParts: string[] = [];
          for (const child of node.children) {
            const childSvg = await extractSvgFromNode(child);
            if (childSvg) {
              svgParts.push(childSvg);
            }
          }
          return svgParts.join('\n  ');
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract SVG content:', error);
    return null;
  }
}

/**
 * Generates an SVG component from a vector node
 */
async function generateSvgComponent(node: SceneNode, tailwindClasses: string): Promise<string> {
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
  
  // Try to extract SVG content
  const svgContent = await extractSvgFromNode(node);
  console.log('SVG content:', svgContent, node.name, node.type, node.parent?.type);
  
  // If we have SVG content, return a complete SVG component
  if (svgContent) {
    return `<svg className="${tailwindClasses}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  ${svgContent}
</svg>\n`;
  }
  
  // Fallback to a basic placeholder SVG
  return `<svg className="${tailwindClasses}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  {/* SVG content would be extracted from Figma */}
</svg>\n`;
}

async function generateComponentBody(
  node: SceneNode,
  tokens: DesignTokens
): Promise<string> {
  const styles = await extractStyles(node);
  const tailwindClasses = cleanupTailwindClasses(stylesToTailwind(styles, tokens));
  let childContent = '';

  if ('children' in node && node.children && node.children.length > 0) {
    for (const child of node.children) {
      childContent += await generateComponentBody(child, tokens);
    }
  }

  const wrapWithElement = (element: string, content: string = '') => {
    return `<${element} className="${tailwindClasses}">\n${content}\n</${element}>`;
  };

  // Handle image nodes
  if (isImageNode(node)) {
    return generateImageComponent(node, tailwindClasses);
  }

  switch (node.type) {
    case 'TEXT':
      return wrapWithElement('span', node.characters) + '\n';
    case 'RECTANGLE':
    case 'ELLIPSE':
      return wrapWithElement('div') + '\n';
    case 'FRAME':
    case 'GROUP':
      return wrapWithElement('div', childContent) + '\n';
    case 'VECTOR':
    case 'LINE':
      // Use SVG component for vectors
      return await generateSvgComponent(node, tailwindClasses);
    case 'POLYGON':
    case 'STAR':
      // Use SVG component for polygons and stars
      return await generateSvgComponent(node, tailwindClasses);
    default:
      return wrapWithElement('div', childContent) + '\n';
  }
}