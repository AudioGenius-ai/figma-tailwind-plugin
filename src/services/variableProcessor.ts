import { rgbToHex } from '../utils/colorUtils';
import { DesignTokenMap } from '../types/styleTypes';

export async function processVariables(designTokenMap: DesignTokenMap): Promise<void> {
  try {
    debugger;
    // Map Figma variables to design tokens
    const variables = await figma.variables.getLocalVariablesAsync();
    
    // First pass: Create a map of all variables for reference resolution
    const variableMap = new Map<string, Variable>();
    variables.forEach(variable => {
      variableMap.set(variable.id, variable);
    });
    debugger;

    // Second pass: Process variables and their resolved values
    variables.forEach(variable => {
      try {
        const resolvedValue = resolveVariableValue(variable, variableMap);
        if (!resolvedValue) return;

        const type = variable.resolvedType;
        if (type !== 'BOOLEAN' && type !== 'COLOR' && type !== 'FLOAT' && type !== 'STRING') return;

        // Get appropriate token name
        const tokenName = variable.codeSyntax?.WEB || variable.name;

        processVariableByType(type, variable, resolvedValue, designTokenMap, tokenName);
      } catch (error) {
        console.error(`Error processing variable ${variable.name}:`, error);
      }
    });
  } catch (error) {
    console.error('Error processing variables:', error);
  }
}

function resolveVariableValue(variable: Variable, variableMap: Map<string, Variable>): VariableValue | null {
  try {
    const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
    if (!collection || collection.modes.length === 0) return null;
    
    const modeId = collection.modes[0].modeId; // Use the first mode as default
    const value = variable.valuesByMode[modeId];
    
    if (!value) return null;

    // If the value is a variable reference, resolve it
    if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
      const referencedVariable = variableMap.get(value.id);
      return referencedVariable ? resolveVariableValue(referencedVariable, variableMap) : null;
    }

    return value;
  } catch (error) {
    console.error('Error resolving variable value:', error);
    return null;
  }
}

function processVariableByType(
  type: string,
  variable: Variable,
  resolvedValue: VariableValue,
  designTokenMap: DesignTokenMap,
  tokenName: string
): void {
  try {
    switch (type) {
      case 'COLOR': {
        processColorVariable(variable, resolvedValue as RGBA, designTokenMap, tokenName);
        break;
      }
      case 'FLOAT': {
        processFloatVariable(variable, resolvedValue as number, designTokenMap, tokenName);
        break;
      }
      case 'STRING': {
        processStringVariable(variable, resolvedValue as string, designTokenMap, tokenName);
        break;
      }
      case 'BOOLEAN': {
        processBooleanVariable(variable, resolvedValue as boolean, designTokenMap, tokenName);
        break;
      }
    }
  } catch (error) {
    console.error(`Error processing variable type ${type}:`, error);
  }
}

function processColorVariable(
  variable: Variable,
  color: RGBA,
  designTokenMap: DesignTokenMap,
  tokenName: string
): void {
  if (variable.scopes.some(scope => 
    ['ALL_SCOPES', 'ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR', 'EFFECT_COLOR'].includes(scope)
  )) {
    const hex = rgbToHex(color.r, color.g, color.b);
    let className = `bg-[${hex}]`;
    
    if (color.a < 1) {
      const opacityPercent = Math.round(color.a * 100);
      className += ` bg-opacity-${opacityPercent}`;
    }
    
    designTokenMap.colors[tokenName] = className;
  }
}

function processFloatVariable(
  variable: Variable,
  value: number,
  designTokenMap: DesignTokenMap,
  tokenName: string
): void {
  if (variable.scopes.some(scope => 
    ['ALL_SCOPES', 'WIDTH_HEIGHT', 'GAP', 'STROKE_FLOAT', 'EFFECT_FLOAT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT'].includes(scope)
  )) {
    const spacing = Math.round(value / 4);
    designTokenMap.spacing[tokenName] = spacing.toString();
  }
}

function processStringVariable(
  variable: Variable,
  value: string,
  designTokenMap: DesignTokenMap,
  tokenName: string
): void {
  if (variable.scopes.some(scope => 
    ['ALL_SCOPES', 'TEXT_CONTENT', 'FONT_FAMILY', 'FONT_STYLE', 'FONT_WEIGHT'].includes(scope)
  )) {
    designTokenMap.typography[tokenName] = value;
  }
}

function processBooleanVariable(
  variable: Variable,
  value: boolean,
  designTokenMap: DesignTokenMap,
  tokenName: string
): void {
  if (variable.scopes.some(scope => 
    ['ALL_SCOPES', 'OPACITY', 'EFFECT_FLOAT'].includes(scope)
  )) {
    designTokenMap.effects[tokenName] = value ? 'visible' : 'invisible';
  }
} 