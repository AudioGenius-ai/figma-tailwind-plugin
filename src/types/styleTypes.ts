export interface StyleReferences {
  fill?: string;
  text?: string;
  effect?: string;
  stroke?: string;
  grid?: string;
}

export interface StyleProperties {
  // Layout properties
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  targetAspectRatio?: number;
  
  // Display and positioning
  display?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  alignSelf?: string;
  flexGrow?: string;
  gap?: string;
  overflow?: string;
  
  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  
  // Typography
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textCase?: string;
  textDecoration?: string;
  paragraphIndent?: string;
  paragraphSpacing?: string;
  listSpacing?: string;
  leadingTrim?: string;
  hangingList?: boolean;
  hangingPunctuation?: boolean;
  openTypeFeatures?: Record<string, boolean>;
  
  // Visual properties
  backgroundColor?: string;
  borderRadius?: string;
  topLeftRadius?: string;
  topRightRadius?: string;
  bottomLeftRadius?: string;
  bottomRightRadius?: string;
  cornerSmoothing?: number;
  border?: string;
  borderStyle?: string;
  strokeWeight?: string;
  strokeAlign?: string;
  opacity?: string;
  boxShadow?: string;
  
  // Background image properties
  backgroundImage?: boolean;
  backgroundImageType?: 'fill' | 'pattern';
  backgroundImageHash?: string;
  backgroundImageUrl?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  
  // Effects and masking
  effects?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
    visible?: boolean;
    blendMode?: string;
  }>;
  blendMode?: string;
  isMask?: boolean;
  maskType?: string;
  clipsContent?: boolean;
  
  // Layout child properties
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutPositioning?: string;
  strokesIncludedInLayout?: boolean;
  
  // References to styles and variables
  styleReferences?: StyleReferences;
  variableReferences?: Record<string, string>;
}

export interface DesignTokenMap {
  colors: { [key: string]: string };
  spacing: { [key: string]: string };
  typography: { [key: string]: string };
  effects: { [key: string]: string };
}

export interface Variable {
  id: string;
  name: string;
  codeSyntax?: {
    WEB: string;
  };
  resolvedType: 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
  variableCollectionId: string;
  valuesByMode: {
    [key: string]: VariableValue;
  };
  scopes: string[];
}

export type VariableValue = RGBA | number | string | boolean | { type: 'VARIABLE_ALIAS'; id: string };

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TextStyle {
  fontSize: number;
  fontName: {
    style: string;
  };
  textDecoration: TextDecoration;
  textCase: TextCase;
  letterSpacing: LetterSpacing;
  lineHeight: LineHeight;
  paragraphSpacing: number;
  paragraphIndent: number;
  textAlignHorizontal?: TextAlignHorizontal;
}

export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH' | 'SMALL_CAPS';
export type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
export type TextAlignHorizontal = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';

export interface LetterSpacing {
  value: number;
  unit: 'PIXELS' | 'PERCENT';
}

export interface LineHeight {
  value?: number;
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;
  offset?: Vector;
  blendMode?: BlendMode;
}

export interface Vector {
  x: number;
  y: number;
}

export type BlendMode = 'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'COLOR_BURN' | 'LIGHTEN' | 'SCREEN' | 'COLOR_DODGE' | 'OVERLAY' | 'SOFT_LIGHT' | 'HARD_LIGHT' | 'DIFFERENCE' | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY';

export interface LayoutGrid {
  pattern: 'ROWS' | 'COLUMNS' | 'GRID';
  visible: boolean;
  gutterSize?: number;
  alignment?: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH';
  count?: number;
  sectionSize?: number;
  offset?: number;
} 