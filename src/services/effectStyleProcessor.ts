import { rgbToHex } from '../utils/colorUtils';
import { DesignTokenMap } from '../types/styleTypes';
import { Effect, DropShadowEffect, InnerShadowEffect, BlurEffect, BlendMode } from '../types/figmaTypes';

export async function processEffectStyles(designTokenMap: DesignTokenMap): Promise<void> {
  try {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    effectStyles.forEach(style => {
      try {
        const tailwindClasses: string[] = [];

        // Process each effect in the style
        style.effects.forEach(effect => {
          if (!effect.visible) return;
          processEffect(effect, tailwindClasses);
        });

        // Store the generated classes
        if (tailwindClasses.length > 0) {
          designTokenMap.effects[style.name] = tailwindClasses.join(' ');
        }
      } catch (error) {
        console.error(`Error processing effect style ${style.name}:`, error);
      }
    });
  } catch (error) {
    console.error('Error processing effect styles:', error);
    throw error;
  }
}

function processEffect(effect: Effect, tailwindClasses: string[]): void {
  try {
    switch (effect.type) {
      case 'DROP_SHADOW':
        processDropShadow(effect, tailwindClasses);
        break;

      case 'INNER_SHADOW':
        processInnerShadow(effect, tailwindClasses);
        break;

      case 'LAYER_BLUR':
      case 'BACKGROUND_BLUR':
        processBlur(effect, tailwindClasses);
        break;
    }
  } catch (error) {
    console.error('Error processing effect:', error);
  }
}

function processDropShadow(effect: DropShadowEffect, tailwindClasses: string[]): void {
  // Map shadow intensity
  const intensity = effect.radius;
  let shadowSize = '';
  if (intensity <= 2) shadowSize = 'shadow-sm';
  else if (intensity <= 4) shadowSize = 'shadow';
  else shadowSize = 'shadow-lg';

  // Convert shadow color to hex
  const shadowColor = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
  
  // Handle shadow opacity
  const opacityValue = Math.round(effect.color.a * 100);
  
  // Handle offset
  const offsetClass = effect.offset.x !== 0 || effect.offset.y !== 0 
    ? `drop-shadow-[${effect.offset.x}px_${effect.offset.y}px_${effect.radius}px_${shadowColor}]`
    : shadowSize;

  tailwindClasses.push(offsetClass);
  if (opacityValue < 100) {
    tailwindClasses.push(`shadow-opacity-${opacityValue}`);
  }

  // Handle blend mode for shadow
  processBlendMode(effect.blendMode, tailwindClasses);
}

function processInnerShadow(effect: InnerShadowEffect, tailwindClasses: string[]): void {
  // Convert shadow color to hex
  const shadowColor = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
  const opacityValue = Math.round(effect.color.a * 100);
  
  // Create inner shadow with offset
  tailwindClasses.push(
    `inner-shadow-[${effect.offset.x}px_${effect.offset.y}px_${effect.radius}px_${shadowColor}]`
  );
  
  if (opacityValue < 100) {
    tailwindClasses.push(`shadow-opacity-${opacityValue}`);
  }

  // Handle blend mode for inner shadow
  processBlendMode(effect.blendMode, tailwindClasses);
}

function processBlur(effect: BlurEffect, tailwindClasses: string[]): void {
  // Map blur intensity
  const blurRadius = effect.radius;
  if (blurRadius <= 2) tailwindClasses.push('blur-sm');
  else if (blurRadius <= 4) tailwindClasses.push('blur');
  else if (blurRadius <= 8) tailwindClasses.push('blur-md');
  else if (blurRadius <= 12) tailwindClasses.push('blur-lg');
  else tailwindClasses.push('blur-xl');

  // Add backdrop class for background blur
  if (effect.type === 'BACKGROUND_BLUR') {
    tailwindClasses.push('backdrop-blur');
  }
}

function processBlendMode(blendMode: BlendMode | undefined, tailwindClasses: string[]): void {
  if (blendMode && blendMode !== 'NORMAL') {
    const blendModeClass = blendMode.toLowerCase();
    tailwindClasses.push(`mix-blend-${blendModeClass}`);
  }
} 