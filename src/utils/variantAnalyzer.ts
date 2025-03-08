import { analyzeVariantRenders, diffVariants, diffTailwindClasses, generateParameterizedTemplate } from "./diffUtils";

/**
 * Interface for a variant mapping configuration
 */
export interface VariantMapping {
  propertyName: string;
  values: string[];
  defaultValue?: string;
}

/**
 * Analyzes render content from different component variants and 
 * generates a mapping of property values to changes
 */
export function analyzeComponentVariants(
  renderFunctions: Record<string, () => string>,
  variantMappings: VariantMapping[]
): Record<string, any> {
  // Convert render functions to strings for analysis
  const renderStrings: Record<string, string> = {};
  
  Object.entries(renderFunctions).forEach(([key, renderFn]) => {
    // For functional components, we need to extract the JSX string
    // This is a simple approach - in real implementation, you might need
    // a more sophisticated way to convert the function to string
    const fnString = renderFn.toString();
    const jsxMatch = fnString.match(/return\s*\(\s*(<[\s\S]*>)\s*\)/m);
    
    if (jsxMatch && jsxMatch[1]) {
      renderStrings[key] = jsxMatch[1];
    } else {
      // Fallback if we can't extract the JSX
      renderStrings[key] = fnString;
    }
  });
  
  // Analyze the variant renders
  const analysis = analyzeVariantRenders(renderStrings);
  
  // Build a mapping of variant properties to changes
  const variantChanges: Record<string, any> = {};
  
  variantMappings.forEach(mapping => {
    const { propertyName, values } = mapping;
    variantChanges[propertyName] = {};
    
    values.forEach(value => {
      const relevantDiffs = Object.entries(analysis.diffs)
        .filter(([diffKey]) => diffKey.includes(`${propertyName}=${value}`))
        .map(([_, diff]) => diff);
      
      if (relevantDiffs.length > 0) {
        variantChanges[propertyName][value] = {
          changedElements: Array.from(new Set(
            relevantDiffs.flatMap(diff => diff.changedElements)
          )),
          addedElements: Array.from(new Set(
            relevantDiffs.flatMap(diff => diff.addedElements)
          )),
          removedElements: Array.from(new Set(
            relevantDiffs.flatMap(diff => diff.removedElements)
          ))
        };
      }
    });
  });
  
  return {
    variantChanges,
    analysis
  };
}

/**
 * Processes a slot configuration object based on tailwind-variants tv format
 * and extracts the differences between variants
 */
export function analyzeSlotVariants(
  variantsConfig: Record<string, Record<string, Record<string, string>>>
): Record<string, any> {
  const results: Record<string, any> = {};
  
  // For each property (e.g., "size", "state")
  Object.entries(variantsConfig).forEach(([propName, propVariants]) => {
    results[propName] = {};
    
    // Get all variant options for this property
    const variantOptions = Object.keys(propVariants);
    if (variantOptions.length <= 1) return;
    
    // Use first variant as baseline
    const baselineVariant = variantOptions[0];
    const baselineConfig = propVariants[baselineVariant];
    
    // Compare each variant to the baseline
    for (let i = 1; i < variantOptions.length; i++) {
      const variantName = variantOptions[i];
      const variantConfig = propVariants[variantName];
      
      // Diff the slots configuration
      const slotDiffs = diffVariants(
        { [baselineVariant]: baselineConfig },
        { [variantName]: variantConfig }
      );
      
      if (slotDiffs.length > 0) {
        results[propName][variantName] = slotDiffs[0];
      }
    }
  });
  
  return results;
}

/**
 * Example of processing the Bottom component from your provided sample
 */
export function analyzeBottomComponent(bottomCode: string): void {
  // Extract the tv configuration
  const tvConfigMatch = bottomCode.match(/const\s+bottom\s*=\s*tv\(\{([\s\S]*?)\}\)/);
  if (!tvConfigMatch) return;
  
  const tvConfigString = tvConfigMatch[1];
  
  // Extract the content renders
  const renderFunctions: Record<string, string> = {};
  const renderMatches = bottomCode.matchAll(/const\s+render_content_(\d+)\s*=\s*\(\)\s*=>\s*\(([\s\S]*?)\);/g);
  
  for (const match of renderMatches) {
    const index = match[1];
    const content = match[2];
    renderFunctions[`content_${index}`] = content;
  }
  
  // Extract variant mappings
  const variantMapMatch = bottomCode.match(/const\s+contentMap\s*=\s*\{([\s\S]*?)\};/);
  if (!variantMapMatch) return;
  
  const variantMapString = variantMapMatch[1];
  const variantMapEntries = variantMapString.matchAll(/'([^']*)':\s*render_content_(\d+)/g);
  
  const variantToContentMap: Record<string, string> = {};
  for (const match of variantMapEntries) {
    const variantKey = match[1];
    const contentIndex = match[2];
    variantToContentMap[variantKey] = renderFunctions[`content_${contentIndex}`];
  }
  
  // Analyze the variant renders
  const analysis = analyzeVariantRenders(variantToContentMap);
  
  console.log('Variant analysis:', analysis);
  
  // Generate a parameterized template using the first content as base
  const firstContent = Object.values(renderFunctions)[0];
  if (firstContent) {
    const template = generateParameterizedTemplate(firstContent, analysis.diffs);
    console.log('Parameterized template:', template);
  }
}

/**
 * Example usage to demonstrate analyzing the CardCampground component
 */
export function analyzeCardComponent(
  renderFunctionContent: Record<string, string>,
  propertyNames: string[]
): {
  parameterizedTemplate: string;
  variantMappings: Record<string, Record<string, any>>;
} {
  // Convert content strings to a format that analyzeVariantRenders expects
  const analysis = analyzeVariantRenders(renderFunctionContent);
  
  // Generate parameterized template from the first render
  const baseRender = Object.values(renderFunctionContent)[0];
  const parameterizedTemplate = generateParameterizedTemplate(baseRender, analysis.diffs);
  
  // Organize diffs by property and value
  const variantMappings: Record<string, Record<string, any>> = {};
  
  propertyNames.forEach(propName => {
    variantMappings[propName] = {};
    
    // Extract values for this property from the render keys
    const valueRegex = new RegExp(`${propName}=([\\w\\s+]+)`, 'i');
    
    Object.keys(renderFunctionContent).forEach(key => {
      const match = key.match(valueRegex);
      if (match && match[1]) {
        const value = match[1];
        
        // Find diffs where this property value is involved
        const relevantDiffs = Object.entries(analysis.diffs)
          .filter(([diffKey]) => diffKey.includes(`${propName}=${value}`))
          .map(([_, diff]) => diff);
        
        if (relevantDiffs.length > 0) {
          variantMappings[propName][value] = {
            changedElements: Array.from(new Set(
              relevantDiffs.flatMap(diff => diff.changedElements)
            )),
            classChanges: relevantDiffs.flatMap(diff => 
              diff.elementChanges
                .filter(change => change.type === 'changed')
                .map(change => ({
                  path: change.path,
                  diff: change.oldValue && change.newValue 
                    ? diffTailwindClasses(change.oldValue, change.newValue)
                    : { added: [], removed: [], unchanged: [] }
                }))
            )
          };
        }
      }
    });
  });
  
  return {
    parameterizedTemplate,
    variantMappings
  };
} 