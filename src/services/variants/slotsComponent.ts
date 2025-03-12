/**
 * Helper to generate a component with slots
 */
export function generateSlotsComponent(
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