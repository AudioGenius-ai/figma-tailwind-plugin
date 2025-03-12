export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'IMAGE';
  visible: boolean;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface SolidPaint extends Paint {
  type: 'SOLID';
  color: RGB;
}

export interface GradientPaint extends Paint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
  gradientStops: GradientStop[];
}

export interface ImagePaint extends Paint {
  type: 'IMAGE';
  scaleMode: 'FIT' | 'FILL' | 'TILE' | 'CROP';
  imageHash?: string;
  imageTransform?: Transform;
}

export interface GradientStop {
  position: number;
  color: RGB;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  visible: boolean;
  radius: number;
  color: RGBA;
  offset: Vector;
  blendMode?: BlendMode;
}

export interface InnerShadowEffect {
  type: 'INNER_SHADOW';
  visible: boolean;
  radius: number;
  color: RGBA;
  offset: Vector;
  blendMode?: BlendMode;
}

export interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
}

export type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect;

export interface GridLayoutGrid {
  pattern: 'GRID';
  visible: boolean;
  sectionSize: number;
}

export interface RowsLayoutGrid {
  pattern: 'ROWS';
  visible: boolean;
  gutterSize: number;
  alignment: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH';
  count: number;
  sectionSize: number;
  offset: number;
}

export interface ColumnsLayoutGrid {
  pattern: 'COLUMNS';
  visible: boolean;
  gutterSize: number;
  alignment: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH';
  count: number;
  sectionSize: number;
  offset: number;
}

export type LayoutGrid = GridLayoutGrid | RowsLayoutGrid | ColumnsLayoutGrid;

export type BlendMode = 'PASS_THROUGH' | 'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'COLOR_BURN' | 'LINEAR_BURN' | 'LINEAR_DODGE' | 'LIGHTEN' | 'SCREEN' | 'COLOR_DODGE' | 'OVERLAY' | 'SOFT_LIGHT' | 'HARD_LIGHT' | 'DIFFERENCE' | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY';

export interface Transform {
  [key: string]: number;
}

// Payment API types
export type PaymentStatus = {
  type: 'PAID' | 'UNPAID'
}

export interface PaymentsAPI {
  readonly status: PaymentStatus
  setPaymentStatusInDevelopment(status: PaymentStatus): void
  getUserFirstRanSecondsAgo(): number
  initiateCheckoutAsync(options?: {
    interstitial?: 'PAID_FEATURE' | 'TRIAL_ENDED' | 'SKIP'
  }): Promise<void>
  requestCheckout(): void
  getPluginPaymentTokenAsync(): Promise<string>
}

// Augment the Figma namespace
declare namespace Figma {
  interface PluginAPI {
    payments: PaymentsAPI;
  }
} 