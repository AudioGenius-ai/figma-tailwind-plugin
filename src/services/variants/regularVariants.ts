/**
 * Helper to generate regular variants (non-slots)
 */
export function generateRegularVariants(variantProps: Record<string, string[]>) {
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