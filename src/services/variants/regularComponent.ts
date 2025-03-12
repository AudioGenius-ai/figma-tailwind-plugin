/**
 * Helper to generate a regular component (non-slots)
 */
export function generateRegularComponent(
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