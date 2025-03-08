import { rgbToHex } from '../utils/colorUtils';
import { DesignTokenMap } from '../types/styleTypes';
import { Paint, SolidPaint, GradientPaint, ImagePaint } from '../types/figmaTypes';

export async function processPaintStyles(designTokenMap: DesignTokenMap): Promise<void> {
  try {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    paintStyles.forEach(style => {
      try {
        const paint = style.paints[0]; // Get the first paint (most common use case)
        if (!paint) return;

        const tailwindClasses = processPaint(paint as Paint & { visible: boolean });

        // Store the generated classes if any were created
        if (tailwindClasses.length > 0) {
          designTokenMap.colors[style.name] = tailwindClasses.join(' ');
        }
      } catch (error) {
        console.error(`Error processing paint style ${style.name}:`, error);
      }
    });
  } catch (error) {
    console.error('Error processing paint styles:', error);
    throw error;
  }
}

function processPaint(paint: Paint & { visible: boolean }): string[] {
  const tailwindClasses: string[] = [];
  
  try {
    switch (paint.type) {
      case 'SOLID':
        processSolidPaint(paint as SolidPaint, tailwindClasses);
        break;

      case 'GRADIENT_LINEAR':
      case 'GRADIENT_RADIAL':
      case 'GRADIENT_ANGULAR':
        processGradientPaint(paint as GradientPaint, tailwindClasses);
        break;

      case 'IMAGE':
        processImagePaint(paint as ImagePaint, tailwindClasses);
        break;
    }

    // Handle blend modes
    if (paint.blendMode && paint.blendMode !== 'NORMAL') {
      const blendMode = paint.blendMode.toLowerCase();
      tailwindClasses.push(`mix-blend-${blendMode}`);
    }
  } catch (error) {
    console.error('Error processing paint:', error);
  }

  return tailwindClasses;
}

function processSolidPaint(paint: SolidPaint, tailwindClasses: string[]): void {
  const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
  tailwindClasses.push(`bg-[${hex}]`);
  
  if (paint.opacity && paint.opacity < 1) {
    const opacityPercent = Math.round(paint.opacity * 100);
    tailwindClasses.push(`bg-opacity-${opacityPercent}`);
  }
}

function processGradientPaint(paint: GradientPaint, tailwindClasses: string[]): void {
  const stops = paint.gradientStops.map(stop => {
    const hex = rgbToHex(stop.color.r, stop.color.g, stop.color.b);
    const position = Math.round(stop.position * (paint.type === 'GRADIENT_ANGULAR' ? 360 : 100));
    return `${hex} ${position}${paint.type === 'GRADIENT_ANGULAR' ? 'deg' : '%'}`;
  }).join(', ');

  switch (paint.type) {
    case 'GRADIENT_LINEAR':
      tailwindClasses.push(`bg-gradient-to-r from-[${stops}]`);
      break;
    case 'GRADIENT_RADIAL':
      tailwindClasses.push(`bg-radial from-[${stops}]`);
      break;
    case 'GRADIENT_ANGULAR':
      tailwindClasses.push(`bg-conic from-[${stops}]`);
      break;
  }
}

function processImagePaint(paint: ImagePaint, tailwindClasses: string[]): void {
  // Basic background image classes
  tailwindClasses.push('bg-cover');
  
  // Handle different scale modes
  switch (paint.scaleMode) {
    case 'FIT':
      tailwindClasses.push('bg-contain bg-center bg-no-repeat');
      break;
    case 'FILL':
      tailwindClasses.push('bg-cover bg-center');
      break;
    case 'CROP':
      // For cropped images, we need position classes to handle alignment
      tailwindClasses.push('bg-no-repeat');
      
      // Add positioning based on imageTransform if available
      if (paint.imageTransform) {
        // This is simplified - in a real implementation you would calculate the correct position
        // based on the transform matrix
        tailwindClasses.push('bg-center');
      } else {
        tailwindClasses.push('bg-center');
      }
      break;
    case 'TILE':
      tailwindClasses.push('bg-repeat');
      break;
    default:
      tailwindClasses.push('bg-center bg-no-repeat');
  }
  
  // Add opacity if available
  if (typeof paint.opacity === 'number' && paint.opacity < 1) {
    const opacityPercentage = Math.round(paint.opacity * 100);
    tailwindClasses.push(`opacity-${opacityPercentage}`);
  }
} 