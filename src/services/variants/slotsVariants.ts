/**
 * Helper to generate slots-based variants
 */
export function generateSlotsVariants(variantProps: Record<string, string[]>, variantMap: Record<string, string>) {
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