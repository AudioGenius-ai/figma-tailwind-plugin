interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Function to convert Figma color to hex
export function rgbToHex(r: number | RGBColor, g?: number, b?: number): string {
  if (typeof r === 'object') {
    return rgbToHexFromObject(r);
  }
  return rgbToHexFromValues(r, g!, b!);
}

// Helper function to convert from RGB object
function rgbToHexFromObject(color: RGBColor): string {
  return rgbToHexFromValues(color.r, color.g, color.b);
}

// Helper function to convert from separate r,g,b values
function rgbToHexFromValues(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Function to convert color to CSS rgb/rgba
export function colorToRgb(color: RGBColor): string {
  const { r, g, b, a } = color;
  const rgb = [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
  
  if (a !== undefined && a !== 1) {
    return `rgba(${rgb.join(', ')}, ${a})`;
  }
  
  return `rgb(${rgb.join(', ')})`;
} 