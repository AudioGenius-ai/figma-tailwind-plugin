import { DesignTokenMap } from '../types/styleTypes';
import { TextStyle, TextDecoration, TextCase, TextAlignHorizontal, LetterSpacing, LineHeight } from '../types/styleTypes';

export async function processTextStyles(designTokenMap: DesignTokenMap): Promise<void> {
  try {
    const textStyles = await figma.getLocalTextStylesAsync();
    textStyles.forEach(style => {
      try {
        const tailwindClasses = processTextStyle(style);
        if (tailwindClasses.length > 0) {
          designTokenMap.typography[style.name] = tailwindClasses.join(' ');
        }
      } catch (error) {
        console.error(`Error processing text style ${style.name}:`, error);
      }
    });
  } catch (error) {
    console.error('Error processing text styles:', error);
    throw error;
  }
}

function processTextStyle(style: TextStyle): string[] {
  const tailwindClasses: string[] = [];

  try {
    // Map font size
    processFontSize(style.fontSize, tailwindClasses);

    // Map font weight
    processFontWeight(style.fontName.style, tailwindClasses);

    // Map text decoration
    processTextDecoration(style.textDecoration, tailwindClasses);

    // Map text case
    processTextCase(style.textCase, tailwindClasses);

    // Map letter spacing
    processLetterSpacing(style.letterSpacing, tailwindClasses);

    // Map line height
    processLineHeight(style.lineHeight, tailwindClasses);

    // Map text alignment
    if (style.textAlignHorizontal) {
      processTextAlignment(style.textAlignHorizontal, tailwindClasses);
    }

    // Add paragraph spacing
    processParagraphSpacing(style.paragraphSpacing, tailwindClasses);

    // Add paragraph indent
    processParagraphIndent(style.paragraphIndent, tailwindClasses);

  } catch (error) {
    console.error('Error processing text style properties:', error);
  }

  return tailwindClasses;
}

function processFontSize(fontSize: number, tailwindClasses: string[]): void {
  if (fontSize >= 30) tailwindClasses.push('text-4xl');
  else if (fontSize >= 24) tailwindClasses.push('text-3xl');
  else if (fontSize >= 20) tailwindClasses.push('text-2xl');
  else if (fontSize >= 16) tailwindClasses.push('text-base');
  else tailwindClasses.push('text-sm');
}

function processFontWeight(fontWeight: string, tailwindClasses: string[]): void {
  const weight = fontWeight.toLowerCase();
  if (weight.includes('bold')) tailwindClasses.push('font-bold');
  else if (weight.includes('semibold')) tailwindClasses.push('font-semibold');
  else if (weight.includes('medium')) tailwindClasses.push('font-medium');
  else if (weight.includes('light')) tailwindClasses.push('font-light');
  else tailwindClasses.push('font-normal');
}

function processTextDecoration(decoration: TextDecoration, tailwindClasses: string[]): void {
  switch (decoration) {
    case 'UNDERLINE':
      tailwindClasses.push('underline');
      break;
    case 'STRIKETHROUGH':
      tailwindClasses.push('line-through');
      break;
    case 'SMALL_CAPS':
      tailwindClasses.push('font-feature-settings-smcp');
      break;
  }
}

function processTextCase(textCase: TextCase, tailwindClasses: string[]): void {
  switch (textCase) {
    case 'UPPER':
      tailwindClasses.push('uppercase');
      break;
    case 'LOWER':
      tailwindClasses.push('lowercase');
      break;
    case 'TITLE':
      tailwindClasses.push('capitalize');
      break;
    case 'SMALL_CAPS':
    case 'SMALL_CAPS_FORCED':
      tailwindClasses.push('font-feature-settings-smcp');
      break;
  }
}

function processLetterSpacing(letterSpacing: LetterSpacing, tailwindClasses: string[]): void {
  if (letterSpacing.value !== 0 && letterSpacing.unit === 'PERCENT') {
    const value = letterSpacing.value;
    if (value <= -3) tailwindClasses.push('tracking-tighter');
    else if (value <= -1) tailwindClasses.push('tracking-tight');
    else if (value >= 3) tailwindClasses.push('tracking-widest');
    else if (value >= 1) tailwindClasses.push('tracking-wide');
  }
}

function processLineHeight(lineHeight: LineHeight, tailwindClasses: string[]): void {
  if ('value' in lineHeight && lineHeight.value !== undefined && lineHeight.unit === 'PERCENT') {
    const value = lineHeight.value;
    if (value <= 100) tailwindClasses.push('leading-none');
    else if (value <= 115) tailwindClasses.push('leading-tight');
    else if (value <= 145) tailwindClasses.push('leading-normal');
    else if (value <= 160) tailwindClasses.push('leading-relaxed');
    else tailwindClasses.push('leading-loose');
  } else if (lineHeight.unit === 'AUTO') {
    tailwindClasses.push('leading-normal');
  }
}

function processTextAlignment(alignment: TextAlignHorizontal, tailwindClasses: string[]): void {
  switch (alignment) {
    case 'LEFT':
      tailwindClasses.push('text-left');
      break;
    case 'CENTER':
      tailwindClasses.push('text-center');
      break;
    case 'RIGHT':
      tailwindClasses.push('text-right');
      break;
    case 'JUSTIFIED':
      tailwindClasses.push('text-justify');
      break;
  }
}

function processParagraphSpacing(spacing: number, tailwindClasses: string[]): void {
  if (spacing > 0) {
    const spacingValue = Math.round(spacing / 4);
    tailwindClasses.push(`mb-${spacingValue}`);
  }
}

function processParagraphIndent(indent: number, tailwindClasses: string[]): void {
  if (indent > 0) {
    const indentValue = Math.round(indent / 4);
    tailwindClasses.push(`indent-${indentValue}`);
  }
} 