import { DesignTokens } from '../types/designTokenTypes';
import { styleNameToVariable } from '../utils/nameUtils';

interface TailwindConfig {
  theme: {
    extend: {
      colors: Record<string, string>;
      fontFamily: Record<string, string>;
      fontSize: Record<string, string>;
      lineHeight: Record<string, string | number>;
      letterSpacing: Record<string, string>;
      boxShadow: Record<string, string>;
      borderRadius: Record<string, string>;
      borderWidth: Record<string, string>;
      spacing: Record<string, string>;
    };
  };
}

export function generateTailwindConfig(tokens: DesignTokens): string {
  const config: TailwindConfig = {
    theme: {
      extend: {
        colors: {},
        fontFamily: {},
        fontSize: {},
        lineHeight: {},
        letterSpacing: {},
        boxShadow: {},
        borderRadius: {},
        borderWidth: {},
        spacing: {}
      }
    }
  };

  // Map tokens to Tailwind theme
  for (const [name] of Object.entries(tokens.colors)) {
    config.theme.extend.colors[styleNameToVariable(name)] = `var(--color-${styleNameToVariable(name)})`;
  }

  // Map typography tokens
  for (const [name] of Object.entries(tokens.typography)) {
    const baseName = styleNameToVariable(name);
    
    config.theme.extend.fontFamily[baseName] = `var(--typography-${baseName}-fontFamily)`;
    config.theme.extend.fontSize[baseName] = `var(--typography-${baseName}-fontSize)`;
    config.theme.extend.lineHeight[baseName] = `var(--typography-${baseName}-lineHeight)`;
    config.theme.extend.letterSpacing[baseName] = `var(--typography-${baseName}-letterSpacing)`;
  }

  // Map spacing tokens
  for (const [name] of Object.entries(tokens.spacing)) {
    config.theme.extend.spacing[styleNameToVariable(name)] = `var(--spacing-${styleNameToVariable(name)})`;
  }

  // Map effect tokens
  for (const [name] of Object.entries(tokens.effects)) {
    config.theme.extend.boxShadow[styleNameToVariable(name)] = `var(--effect-${styleNameToVariable(name)})`;
  }

  // Map border radius tokens
  for (const [name] of Object.entries(tokens.borderRadius)) {
    config.theme.extend.borderRadius[styleNameToVariable(name)] = `var(--radius-${styleNameToVariable(name)})`;
  }

  // Map border width tokens
  for (const [name] of Object.entries(tokens.borderWidth)) {
    config.theme.extend.borderWidth[styleNameToVariable(name)] = `var(--border-width-${styleNameToVariable(name)})`;
  }

  return `module.exports = ${JSON.stringify(config, null, 2)}`;
} 