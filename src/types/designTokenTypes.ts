export type DesignTokenValue = string | number | {
  [key: string]: string | number;
};

export type DesignToken = {
  value: DesignTokenValue;
  type: string;
  description?: string;
};

export interface ColorToken {
  value: string;
  type: 'color';
  description?: string;
}

export interface TypographyValue {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string | number;
  letterSpacing: number;
}

export interface TypographyToken {
  value: TypographyValue;
  type: 'typography';
}

export interface ShadowValue {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

export interface EffectToken {
  value: ShadowValue;
  type: 'shadow';
}

export interface SpacingToken {
  value: number;
  type: 'spacing';
}

export interface BorderRadiusToken {
  value: number;
  type: 'borderRadius';
}

export interface BorderWidthToken {
  value: number;
  type: 'borderWidth';
}

export interface DesignTokens {
  colors: Record<string, ColorToken>;
  typography: Record<string, TypographyToken>;
  spacing: Record<string, SpacingToken>;
  effects: Record<string, EffectToken>;
  borderRadius: Record<string, BorderRadiusToken>;
  borderWidth: Record<string, BorderWidthToken>;
} 