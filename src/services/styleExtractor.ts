import { StyleProperties } from '../types/styleTypes';
import { rgbToHex } from '../utils/colorUtils';

export async function extractStyles(node: SceneNode): Promise<StyleProperties> {
  const styles: StyleProperties = {};
  styles.styleReferences = {};
  styles.variableReferences = {};
  
  // Extract dimensions and constraints
  if ('width' in node && typeof node.width === 'number') {
    styles.width = `${Math.round(node.width)}px`;
  }
  
  if ('height' in node && typeof node.height === 'number') {
    styles.height = `${Math.round(node.height)}px`;
  }

  if ('minWidth' in node && node.minWidth !== null) {
    styles.minWidth = `${Math.round(node.minWidth)}px`;
  }

  if ('maxWidth' in node && node.maxWidth !== null) {
    styles.maxWidth = `${Math.round(node.maxWidth)}px`;
  }

  if ('minHeight' in node && node.minHeight !== null) {
    styles.minHeight = `${Math.round(node.minHeight)}px`;
  }

  if ('maxHeight' in node && node.maxHeight !== null) {
    styles.maxHeight = `${Math.round(node.maxHeight)}px`;
  }

  if ('targetAspectRatio' in node && node.targetAspectRatio !== null) {
    styles.targetAspectRatio = Number(node.targetAspectRatio);
  }
  
  // Extract style references
  await extractStyleReferences(node, styles);
  
  // Extract variable references
  await extractVariableReferences(node, styles);
  
  // Extract visual properties
  extractVisualProperties(node, styles);
  
  // Extract layout properties
  extractLayoutProperties(node, styles);
  
  // Extract text properties
  if (node.type === 'TEXT') {
    extractTextProperties(node, styles);
  }
  
  return styles;
}

async function extractStyleReferences(node: SceneNode, styles: StyleProperties): Promise<void> {
  if ('fillStyleId' in node && node.fillStyleId) {
    try {
      // Make sure the style ID is a string before passing it to getStyleByIdAsync
      const styleId = typeof node.fillStyleId === 'string' ? node.fillStyleId : String(node.fillStyleId);
      const style = await figma.getStyleByIdAsync(styleId);
      if (style && style.type === 'PAINT') {
        styles.styleReferences!.fill = style.name;
      }
    } catch (error) {
      console.error('Error getting fill style:', error);
    }
  }
  
  if ('textStyleId' in node && node.textStyleId) {
    try {
      const styleId = typeof node.textStyleId === 'string' ? node.textStyleId : String(node.textStyleId);
      const style = await figma.getStyleByIdAsync(styleId);
      if (style && style.type === 'TEXT') {
        styles.styleReferences!.text = style.name;
      }
    } catch (error) {
      console.error('Error getting text style:', error);
    }
  }
  
  if ('effectStyleId' in node && node.effectStyleId) {
    try {
      const styleId = typeof node.effectStyleId === 'string' ? node.effectStyleId : String(node.effectStyleId);
      const style = await figma.getStyleByIdAsync(styleId);
      if (style && style.type === 'EFFECT') {
        styles.styleReferences!.effect = style.name;
      }
    } catch (error) {
      console.error('Error getting effect style:', error);
    }
  }
  
  if ('strokeStyleId' in node && node.strokeStyleId) {
    try {
      const styleId = typeof node.strokeStyleId === 'string' ? node.strokeStyleId : String(node.strokeStyleId);
      const style = await figma.getStyleByIdAsync(styleId);
      if (style && style.type === 'PAINT') {
        styles.styleReferences!.stroke = style.name;
      }
    } catch (error) {
      console.error('Error getting stroke style:', error);
    }
  }
}

async function extractVariableReferences(node: SceneNode, styles: StyleProperties): Promise<void> {
  if ('boundVariables' in node) {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      for (const collection of collections) {
        const variables = await figma.variables.getVariableCollectionByIdAsync(collection.id);

        if (variables && variables.variableIds) {
          for (const variableId of variables.variableIds) {
            try {
              // Make sure variableId is a string
              const id = typeof variableId === 'string' ? variableId : String(variableId);
              const variable = await figma.variables.getVariableByIdAsync(id);
              if (!variable) continue;
              const defaultValue = variable.valuesByMode[collection.defaultModeId];
              if (defaultValue) {
                styles.variableReferences![variable.name] = `${collection.name}/${variable.name}`;
              }
            } catch (variableError) {
              console.error('Error processing variable:', variableError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting variable references:', error);
    }
  }
}

function extractVisualProperties(node: SceneNode, styles: StyleProperties): void {
  // Handle fills
  if (!styles.styleReferences!.fill && 'fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.visible !== false) {
      styles.backgroundColor = rgbToHex(fill.color);
      if ('opacity' in fill && fill.opacity! < 1) {
        styles.opacity = fill.opacity!.toString();
      }
    } else if (fill.type === 'IMAGE' && fill.visible !== false) {
      // Extract image fill details
      styles.backgroundImage = true;
      styles.backgroundImageType = 'fill';
      
      // Store the image hash if available
      if ('imageHash' in fill && fill.imageHash) {
        styles.backgroundImageHash = fill.imageHash;
      }
      
      // Store scaling information
      if ('scaleMode' in fill) {
        styles.backgroundSize = fill.scaleMode === 'FILL' ? 'cover' : 'contain';
      }
    }
  }
  
  // Handle corner properties
  if ('cornerRadius' in node) {
    if (typeof node.cornerRadius === 'number') {
      styles.borderRadius = `${node.cornerRadius}px`;
    }
  }

  // Handle individual corner radii
  if ('topLeftRadius' in node && 'topRightRadius' in node && 'bottomLeftRadius' in node && 'bottomRightRadius' in node) {
    const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius } = node;
    
    // Store individual corner radii
    styles.topLeftRadius = `${topLeftRadius}px`;
    styles.topRightRadius = `${topRightRadius}px`;
    styles.bottomRightRadius = `${bottomRightRadius}px`;
    styles.bottomLeftRadius = `${bottomLeftRadius}px`;
    
    // If all corners are equal, use the shorthand
    if (topLeftRadius === topRightRadius && topRightRadius === bottomRightRadius && bottomRightRadius === bottomLeftRadius) {
      styles.borderRadius = `${topLeftRadius}px`;
    } else {
      // Otherwise specify each corner individually
      styles.borderRadius = `${topLeftRadius}px ${topRightRadius}px ${bottomRightRadius}px ${bottomLeftRadius}px`;
    }
  }

  if ('cornerSmoothing' in node && typeof node.cornerSmoothing === 'number' && node.cornerSmoothing > 0) {
    styles.cornerSmoothing = node.cornerSmoothing;
  }

  // Handle strokes
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.visible !== false) {
      const color = rgbToHex(stroke.color);
      if ('strokeWeight' in node) {
        styles.strokeWeight = `${String(node.strokeWeight)}px`;
        styles.border = `${String(node.strokeWeight)}px solid ${color}`;
      }
    }
  }

  // Handle effects
  if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
    styles.effects = node.effects.map(effect => {
      if (effect.type === 'DROP_SHADOW' && effect.visible) {
        return {
          type: 'DROP_SHADOW',
          color: effect.color,
          offset: { x: Math.round(effect.offset.x), y: Math.round(effect.offset.y) },
          radius: Math.round(effect.radius),
          spread: effect.spread,
          visible: effect.visible,
          blendMode: effect.blendMode
        };
      }
      return effect;
    });

    const shadowEffect = node.effects.find(e => e.type === 'DROP_SHADOW' && e.visible);
    if (shadowEffect && shadowEffect.type === 'DROP_SHADOW') {
      const color = rgbToHex(shadowEffect.color);
      const x = Math.round(shadowEffect.offset.x);
      const y = Math.round(shadowEffect.offset.y);
      const blur = Math.round(shadowEffect.radius);
      const spread = shadowEffect.spread ? Math.round(shadowEffect.spread) : 0;
      styles.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }
  }
}

function extractLayoutProperties(node: SceneNode, styles: StyleProperties): void {
  if ('layoutMode' in node) {
    styles.display = 'flex';
    styles.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    
    if ('layoutWrap' in node) {
      styles.flexWrap = node.layoutWrap === 'WRAP' ? 'wrap' : 'nowrap';
    }

    if ('primaryAxisSizingMode' in node) {
      styles.layoutSizingHorizontal = node.primaryAxisSizingMode;
    }

    if ('counterAxisSizingMode' in node) {
      styles.layoutSizingVertical = node.counterAxisSizingMode;
    }
    
    // Handle alignment
    if ('primaryAxisAlignItems' in node) {
      switch (node.primaryAxisAlignItems) {
        case 'MIN':
          styles.justifyContent = 'flex-start';
          break;
        case 'CENTER':
          styles.justifyContent = 'center';
          break;
        case 'MAX':
          styles.justifyContent = 'flex-end';
          break;
        case 'SPACE_BETWEEN':
          styles.justifyContent = 'space-between';
          break;
      }
    }
    
    if ('counterAxisAlignItems' in node) {
      switch (node.counterAxisAlignItems) {
        case 'MIN':
          styles.alignItems = 'flex-start';
          break;
        case 'CENTER':
          styles.alignItems = 'center';
          break;
        case 'MAX':
          styles.alignItems = 'flex-end';
          break;
        case 'BASELINE':
          styles.alignItems = 'baseline';
          break;
      }
    }
    
    // Handle gap
    if ('itemSpacing' in node && node.itemSpacing > 0) {
      styles.gap = `${node.itemSpacing}px`;
    }
  }

  // Handle layout align (align-self)
  if ('layoutAlign' in node) {
    switch (node.layoutAlign) {
      case 'STRETCH':
        styles.alignSelf = 'stretch';
        break;
      case 'MIN':
        styles.alignSelf = 'flex-start';
        break;
      case 'CENTER':
        styles.alignSelf = 'center';
        break;
      case 'MAX':
        styles.alignSelf = 'flex-end';
        break;
    }
  }

  // Handle layout grow (flex-grow)
  if ('layoutGrow' in node) {
    styles.flexGrow = node.layoutGrow.toString();
  }

  // Handle overflow
  if ('clipsContent' in node) {
    styles.overflow = node.clipsContent ? 'hidden' : 'visible';
  }

  // Handle padding
  if ('paddingLeft' in node && 'paddingRight' in node && 'paddingTop' in node && 'paddingBottom' in node) {
    const { paddingLeft, paddingRight, paddingTop, paddingBottom } = node;
    styles.paddingTop = `${paddingTop}px`;
    styles.paddingRight = `${paddingRight}px`;
    styles.paddingBottom = `${paddingBottom}px`;
    styles.paddingLeft = `${paddingLeft}px`;
    
    if (paddingLeft === paddingRight && paddingTop === paddingBottom && paddingLeft === paddingTop) {
      styles.padding = `${paddingTop}px`;
    } else {
      styles.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    }
  }
}

function extractTextProperties(node: TextNode, styles: StyleProperties): void {
  if (node.fontSize) styles.fontSize = `${String(node.fontSize)}px`;
  
  if (node.fontName && typeof node.fontName !== 'symbol') {
    styles.fontFamily = node.fontName.family;
    styles.fontStyle = node.fontName.style;
  }
  
  if (node.fontWeight && typeof node.fontWeight !== 'symbol') {
    styles.fontWeight = String(node.fontWeight);
  }
  
  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      styles.color = rgbToHex(fill.color);
    }
  }
  
  if (node.textAlignHorizontal) {
    switch (node.textAlignHorizontal) {
      case 'LEFT':
        styles.textAlign = 'left';
        break;
      case 'CENTER':
        styles.textAlign = 'center';
        break;
      case 'RIGHT':
        styles.textAlign = 'right';
        break;
      case 'JUSTIFIED':
        styles.textAlign = 'justify';
        break;
    }
  }
  
  if (node.lineHeight && typeof node.lineHeight !== 'symbol') {
    if (node.lineHeight.unit === 'PIXELS') {
      styles.lineHeight = `${node.lineHeight.value}px`;
    } else if (node.lineHeight.unit === 'PERCENT') {
      styles.lineHeight = `${node.lineHeight.value / 100}`;
    } else if (node.lineHeight.unit === 'AUTO') {
      styles.lineHeight = 'normal';
    }
  }

  if (node.letterSpacing && typeof node.letterSpacing !== 'symbol') {
    if (node.letterSpacing.unit === 'PIXELS') {
      styles.letterSpacing = `${node.letterSpacing.value}px`;
    } else if (node.letterSpacing.unit === 'PERCENT') {
      styles.letterSpacing = `${node.letterSpacing.value}%`;
    }
  }

  // Handle additional text properties
  if ('listSpacing' in node) {
    styles.listSpacing = `${node.listSpacing}px`;
  }

  if ('leadingTrim' in node && typeof node.leadingTrim !== 'symbol') {
    styles.leadingTrim = node.leadingTrim.toLowerCase();
  }

  if ('hangingList' in node) {
    styles.hangingList = node.hangingList;
  }

  if ('openTypeFeatures' in node && typeof node.openTypeFeatures !== 'symbol') {
    styles.openTypeFeatures = node.openTypeFeatures;
  }
} 