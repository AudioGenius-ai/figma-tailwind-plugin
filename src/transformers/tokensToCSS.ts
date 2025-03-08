import { DesignTokens, TypographyValue, ShadowValue } from '../types/designTokenTypes';
import { styleNameToVariable } from '../utils/nameUtils';

export function generateCssVariables(tokens: DesignTokens): string {
  let css = ':root {\n';
  
  // Process colors
  Object.entries(tokens.colors).forEach(([name, token]) => {
    css += `  --color-${styleNameToVariable(name)}: ${token.value};\n`;
  });
  
  // Process typography
  Object.entries(tokens.typography).forEach(([name, token]) => {
    const value = token.value as TypographyValue;
    css += `  --typography-${styleNameToVariable(name)}-fontFamily: ${value.fontFamily};\n`;
    css += `  --typography-${styleNameToVariable(name)}-fontSize: ${value.fontSize}px;\n`;
    css += `  --typography-${styleNameToVariable(name)}-fontWeight: ${value.fontWeight};\n`;
    css += `  --typography-${styleNameToVariable(name)}-lineHeight: ${value.lineHeight};\n`;
    css += `  --typography-${styleNameToVariable(name)}-letterSpacing: ${value.letterSpacing}px;\n`;
  });
  
  // Process spacing
  Object.entries(tokens.spacing).forEach(([name, token]) => {
    css += `  --spacing-${styleNameToVariable(name)}: ${token.value}px;\n`;
  });
  
  // Process effects
  Object.entries(tokens.effects).forEach(([name, token]) => {
    const value = token.value as ShadowValue;
    css += `  --effect-${styleNameToVariable(name)}: ${value.x}px ${value.y}px ${value.blur}px ${value.spread}px ${value.color};\n`;
  });
  
  // Process border radius
  Object.entries(tokens.borderRadius).forEach(([name, token]) => {
    css += `  --radius-${styleNameToVariable(name)}: ${token.value}px;\n`;
  });
  
  // Process border width
  Object.entries(tokens.borderWidth).forEach(([name, token]) => {
    css += `  --border-width-${styleNameToVariable(name)}: ${token.value}px;\n`;
  });
  
  css += '}\n';
  return css;
} 