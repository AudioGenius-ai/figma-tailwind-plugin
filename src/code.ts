// This plugin will generate React components with Tailwind CSS from Figma designs
// Code in this file has access to the Figma document via the figma global object

import { extractDesignTokens } from './services/designTokenExtractor';
import { generateCssVariables } from './transformers/tokensToCSS';
import { generateTailwindConfig } from './transformers/tokensToTailwind';
import { generateReactComponent } from './services/componentGenerator';
import { processVariables } from './services/variableProcessor';
import { processPaintStyles } from './services/paintStyleProcessor';
import { processTextStyles } from './services/textStyleProcessor';
import { processEffectStyles } from './services/effectStyleProcessor';
import { processGridStyles } from './services/gridStyleProcessor';
import { DesignTokens } from './types/designTokenTypes';
import { js_beautify, html_beautify } from 'js-beautify';

// Define interfaces for component analysis
interface ComponentInfo {
  name: string;
  jsx: string;
}

interface ComponentVariantInfo extends ComponentInfo {
  variantName?: string;
  baseComponentName?: string;
}

figma.codegen.on('generate', async (event) => {
  try {
    const node = event.node;
    
    // Extract design tokens
    const tokens = await extractDesignTokens();
    
    // Generate CSS variables
    const cssVariables = generateCssVariables(tokens);
    
    // Generate Tailwind config
    const tailwindConfig = generateTailwindConfig(tokens);
    
    // Generate the React component
    const reactCode = await generateReactComponent(node, tokens, true);
        
    // Enhanced beautification for React JSX code
    // First use html_beautify to handle JSX tags and attributes properly
    const htmlBeautified = html_beautify(reactCode, {
      indent_size: 2,
      indent_char: ' ',
      max_preserve_newlines: 1,
      preserve_newlines: true,
      indent_inner_html: true,
      unformatted: ['code', 'pre'],
      content_unformatted: ['pre', 'code', 'textarea'],
      extra_liners: ['head', 'body', '/html'],
      wrap_attributes: 'auto',
      templating: ['auto']
    });
    
    // Then use js_beautify to format JavaScript parts
    const beautifiedReactCode = js_beautify(htmlBeautified, {
      indent_size: 2,
      indent_char: ' ',
      max_preserve_newlines: 2,
      preserve_newlines: true,
      keep_array_indentation: true,
      break_chained_methods: false,
      brace_style: 'collapse',
      space_before_conditional: true,
      unescape_strings: false,
      jslint_happy: false,
      end_with_newline: true,
      wrap_line_length: 100,
      indent_empty_lines: false,
      e4x: true // Important for JSX
    });
    
    // Apply specific formatting cleanup for React code
    const finalReactCode = beautifiedReactCode

    return [
      {
        language: 'JAVASCRIPT',
        code: finalReactCode,
        title: 'React Component',
      },
      {
        language: 'CSS',
        code: cssVariables,
        title: 'CSS Variables',
      },
      {
        language: 'JAVASCRIPT',
        code: tailwindConfig,
        title: 'Tailwind Config',
      },
    ];
  } catch (error) {
    console.error('Error in code generation:', error);
    throw error;
  }
});