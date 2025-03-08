import { DesignTokens } from '../types/designTokenTypes';
import { colorToRgb } from '../utils/colorUtils';

export async function extractDesignTokens(): Promise<DesignTokens> {
  const tokens: DesignTokens = {
    colors: {},
    typography: {},
    spacing: {},
    effects: {},
    borderRadius: {},
    borderWidth: {}
  };

  // Get all local styles
  const [paintStyles, textStyles, effectStyles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync()
  ]);

  // Process color styles
  for (const style of paintStyles) {
    if (style.paints[0]?.type === 'SOLID') {
      const color = style.paints[0].color;
      const opacity = style.paints[0].opacity;
      tokens.colors[style.name] = {
        value: opacity !== undefined && opacity !== 1 ? 
          colorToRgb({ ...color, a: opacity }) :
          colorToRgb(color),
        type: 'color',
        description: style.description
      };
    }
  }

  // Process typography styles
  for (const style of textStyles) {
    tokens.typography[style.name] = {
      value: {
        fontFamily: style.fontName.family,
        fontSize: style.fontSize,
        fontWeight: style.fontName.style,
        lineHeight: style.lineHeight.unit === 'PIXELS' ? 
          'value' in style.lineHeight ? style.lineHeight.value : '100%' :
          style.lineHeight.unit === 'PERCENT' ? 
            'value' in style.lineHeight ? `${style.lineHeight.value}%` : '100%' : 
            'auto',
        letterSpacing: 'value' in style.letterSpacing ? style.letterSpacing.value : 0
      },
      type: 'typography'
    };
  }

  // Process effect styles
  for (const style of effectStyles) {
    if (style.effects[0]?.type === 'DROP_SHADOW') {
      const shadow = style.effects[0];
      tokens.effects[style.name] = {
        value: {
          x: shadow.offset.x,
          y: shadow.offset.y,
          blur: shadow.radius,
          spread: shadow.spread || 0,
          color: colorToRgb(shadow.color)
        },
        type: 'shadow'
      };
    }
  }

  // Get variables for additional tokens
  await extractVariableTokens(tokens);

  return tokens;
}

async function extractVariableTokens(tokens: DesignTokens): Promise<void> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  for (const collection of collections) {
    const variables = await figma.variables.getVariableCollectionByIdAsync(collection.id);
    for (const variableId of variables?.variableIds ?? []) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) continue;

      const value = variable.valuesByMode[collection.defaultModeId];
      const name = `${collection.name}/${variable.name}`;
      
      if (typeof value === 'number') {
        // Check variable name to categorize it
        if (name.toLowerCase().includes('radius')) {
          tokens.borderRadius[name] = {
            value,
            type: 'borderRadius'
          };
        } else if (name.toLowerCase().includes('width') || name.toLowerCase().includes('stroke')) {
          tokens.borderWidth[name] = {
            value,
            type: 'borderWidth'
          };
        } else {
          tokens.spacing[name] = {
            value,
            type: 'spacing'
          };
        }
      } else if (typeof value === 'object' && 'r' in value) {
        tokens.colors[name] = {
          value: colorToRgb(value),
          type: 'color'
        };
      }
    }
  }
} 