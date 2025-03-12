/**
 * Helper to format component code with proper indentation
 * Specialized for deeply nested React/React Native JSX structures
 * Keeps indentation consistent regardless of nesting depth
 * Properly aligns props and nested tags
 * Removes empty lines for compact output
 */
export function formatCode(code: string, initialIndent: number = 0, platform: 'react' | 'react-native' = 'react'): string {
  if (!code || code.trim() === '') return '';
  
  // Preprocess the code for better component function formatting
  code = preprocessReactComponent(code);
  
  // Apply a simpler, direct JSX formatter for more predictable results
  code = directJsxFormat(code, initialIndent);
  
  return code;
}

/**
 * Token types for our simplified JSX parser
 */
enum TokenType {
  OpenTag,        // <div>
  CloseTag,       // </div>
  SelfClosingTag, // <img />
  JSXAttribute,   // prop="value"
  JSXExpression,  // {expression}
  Text,           // Plain text content
  Whitespace      // Spaces, tabs, newlines
}

/**
 * Represents a single token in our JSX structure
 */
interface Token {
  type: TokenType;
  content: string;
  children?: Token[];
  parent?: Token;
  tagName?: string;
  attributes?: string[];
}

/**
 * Tokenize JSX code into a simplified AST-like structure
 */
function tokenizeJSX(code: string, platform: 'react' | 'react-native' = 'react'): Token[] {
  // Trim but preserve internal formatting
  code = code.trim();
  
  const tokens: Token[] = [];
  let currentIndex = 0;
  
  // Character-by-character processing
  while (currentIndex < code.length) {
    const char = code[currentIndex];
    
    // Process tag structure
    if (char === '<') {
      // Possible tag beginning
      if (currentIndex + 1 < code.length) {
        const nextChar = code[currentIndex + 1];
        
        // Handle closing tag </tag>
        if (nextChar === '/') {
          const tagEndIndex = findTagEnd(code, currentIndex);
          if (tagEndIndex !== -1) {
            const closeTagContent = code.substring(currentIndex, tagEndIndex + 1);
            
            // Extract tag name for matching
            const tagNameMatch = closeTagContent.match(/<\/([^\s>]+)/);
            const tagName = tagNameMatch ? tagNameMatch[1] : '';
            
            tokens.push({
              type: TokenType.CloseTag,
              content: closeTagContent,
              tagName
            });
            
            currentIndex = tagEndIndex + 1;
            continue;
          }
        }
        // Handle opening or self-closing tag
        else if (nextChar !== '!' && nextChar !== '?') { // Not a comment or processing instruction
          const tagEndIndex = findTagEnd(code, currentIndex);
          if (tagEndIndex !== -1) {
            const tagContent = code.substring(currentIndex, tagEndIndex + 1);
            const isSelfClosing = tagContent.endsWith('/>') || 
              (platform !== 'react-native' && isVoidElement(tagContent));
            
            // Extract tag name
            const tagNameMatch = tagContent.match(/<([^\s/>]+)/);
            const tagName = tagNameMatch ? tagNameMatch[1] : '';
            
            // Extract attributes precisely, preserving JSX expressions inside attributes
            const attributes = extractAttributes(tagContent, currentIndex);
            
            if (isSelfClosing) {
              tokens.push({
                type: TokenType.SelfClosingTag,
                content: tagContent,
                tagName,
                attributes
              });
            } else {
              tokens.push({
                type: TokenType.OpenTag,
                content: tagContent,
                tagName,
                attributes,
                children: []
              });
            }
            
            currentIndex = tagEndIndex + 1;
            continue;
          }
        }
      }
    }
    
    // Process JSX expressions {expression}
    else if (char === '{') {
      const closingBraceIndex = findMatchingClosingBrace(code, currentIndex);
      if (closingBraceIndex !== -1) {
        const expressionContent = code.substring(currentIndex, closingBraceIndex + 1);
        tokens.push({
          type: TokenType.JSXExpression,
          content: expressionContent
        });
        
        currentIndex = closingBraceIndex + 1;
        continue;
      }
    }
    
    // Process significant whitespace that might affect formatting
    if (/\s/.test(char)) {
      let wsEnd = currentIndex;
      // Find the extent of this whitespace block
      while (wsEnd < code.length && /\s/.test(code[wsEnd])) {
        wsEnd++;
      }
      
      const whitespace = code.substring(currentIndex, wsEnd);
      
      // Only create tokens for significant whitespace
      if (whitespace.includes('\n')) {
        tokens.push({
          type: TokenType.Whitespace,
          content: whitespace
        });
        
        currentIndex = wsEnd;
        continue;
      }
    }
    
    // Process text node (anything not captured by the above)
    let textEndIndex = findNextSpecialChar(code, currentIndex);
    if (textEndIndex === -1) textEndIndex = code.length;
    
    // Handle text content - preserve even mostly whitespace text
    const textContent = code.substring(currentIndex, textEndIndex);
    if (textContent.length > 0 && !/^\s+$/.test(textContent)) {
      tokens.push({
        type: TokenType.Text,
        content: textContent
      });
    }
    
    currentIndex = textEndIndex;
  }
  
  return buildNestedStructure(tokens);
}

// Helper to find the end of a tag
function findTagEnd(code: string, startIndex: number): number {
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = startIndex; i < code.length; i++) {
    const char = code[i];
    
    // Handle quotes
    if ((char === '"' || char === "'") && (i === 0 || code[i-1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }
    
    // Only process tag structure outside of quotes
    if (!inQuote) {
      if (char === '<') {
        depth++;
      } else if (char === '>') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }
  
  return -1; // No matching end found
}

// Helper to determine if a tag is a void element (self-closing in HTML)
function isVoidElement(tag: string): boolean {
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                        'link', 'meta', 'param', 'source', 'track', 'wbr'];
  
  for (const element of voidElements) {
    if (tag.match(new RegExp(`<${element}[\\s/>]`, 'i'))) {
      return true;
    }
  }
  
  return false;
}

// Helper to find next special character position
function findNextSpecialChar(code: string, startIndex: number): number {
  const specialChars = ['<', '{'];
  
  for (let i = startIndex; i < code.length; i++) {
    if (specialChars.includes(code[i])) {
      return i;
    }
  }
  
  return -1; // No special char found
}

// Helper to extract attributes accurately
function extractAttributes(tagContent: string, startOffset: number = 0): string[] {
  const attributes: string[] = [];
  let inQuote = false;
  let quoteChar = '';
  let currentAttribute = '';
  let insideBraces = 0;
  
  // Skip the tag name
  let startIndex = tagContent.indexOf(' ');
  if (startIndex === -1) return [];
  
  for (let i = startIndex; i < tagContent.length; i++) {
    const char = tagContent[i];
    
    // Track braces for JSX expressions
    if (!inQuote) {
      if (char === '{') {
        insideBraces++;
      } else if (char === '}') {
        insideBraces--;
      }
    }
    
    // Track quotes
    if ((char === '"' || char === "'") && (i === 0 || tagContent[i-1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }
    
    // Process characters
    if (char === '>' && !inQuote && insideBraces === 0) {
      // End of tag - save last attribute if exists
      if (currentAttribute.trim()) {
        attributes.push(currentAttribute.trim());
      }
      break;
    } else if (char === '/' && tagContent[i+1] === '>' && !inQuote && insideBraces === 0) {
      // End of self-closing tag - save last attribute if exists
      if (currentAttribute.trim()) {
        attributes.push(currentAttribute.trim());
      }
      break;
    } else if (/\s/.test(char) && !inQuote && insideBraces === 0) {
      // Space outside quotes/braces could indicate attribute boundary
      if (currentAttribute.trim()) {
        attributes.push(currentAttribute.trim());
        currentAttribute = '';
      }
    } else {
      currentAttribute += char;
    }
  }
  
  return attributes;
}

/**
 * Find the matching closing brace for a JSX expression
 */
function findMatchingClosingBrace(code: string, startIndex: number): number {
  let depth = 0;
  let i = startIndex;
  
  while (i < code.length) {
    if (code[i] === '{') {
      depth++;
    } else if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  
  return -1;
}

/**
 * Build a nested structure from the flat tokens array
 */
function buildNestedStructure(tokens: Token[]): Token[] {
  const rootTokens: Token[] = [];
  const stack: Token[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === TokenType.OpenTag) {
      // If we're inside another tag, add this as a child
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        token.parent = parent;
        parent.children.push(token);
      } else {
        // This is a top level tag
        rootTokens.push(token);
      }
      
      // Add this tag to the stack for potential children
      stack.push(token);
    }
    else if (token.type === TokenType.CloseTag) {
      // Check if the stack has a matching opening tag
      if (stack.length > 0) {
        // Try to match with the most recent opening tag
        const lastOpenTag = stack[stack.length - 1];
        
        // If the tags match by name, pop from the stack (ending this tag)
        if (lastOpenTag.tagName === token.tagName) {
          stack.pop();
        }
        // If tags don't match, we have a problem - try to recover
        else {
          // Look for a matching tag deeper in the stack
          let matchIndex = -1;
          for (let j = stack.length - 2; j >= 0; j--) {
            if (stack[j].tagName === token.tagName) {
              matchIndex = j;
              break;
            }
          }
          
          if (matchIndex !== -1) {
            // We found a match earlier in the stack - close all tags up to that point
            const matchingTag = stack[matchIndex];
            // Pop all tags up to the matching one
            stack.splice(matchIndex);
          } else {
            // No matching tag was found - this is an orphaned closing tag
            if (stack.length > 0) {
              const parent = stack[stack.length - 1];
              if (!parent.children) parent.children = [];
              parent.children.push(token);
            } else {
              rootTokens.push(token);
            }
          }
        }
      } else {
        // This is an orphaned closing tag at root level
        rootTokens.push(token);
      }
    }
    else {
      // Handle other token types (text, self-closing tags, etc.)
      if (stack.length > 0) {
        // Add as child to current parent
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        token.parent = parent;
        parent.children.push(token);
      } else {
        // Add at root level
        rootTokens.push(token);
      }
    }
  }
  
  // Handle any unclosed tags left in the stack
  while (stack.length > 0) {
    const unclosedTag = stack.pop()!;
    
    // If it's already a child of something, leave it where it is
    if (unclosedTag.parent) {
      continue;
    }
    
    // Otherwise it should be at the root
    if (!rootTokens.includes(unclosedTag)) {
      rootTokens.push(unclosedTag);
    }
  }
  
  return rootTokens;
}

/**
 * Generate formatted code from the token structure
 */
function generateFormattedCode(tokens: Token[], initialIndent: number = 0): string {
  const result: string[] = [];
  const indentSize = 2; // Spaces per indentation level
  
  function printToken(token: Token, depth: number): void {
    const indent = ' '.repeat((depth * indentSize) + (initialIndent * indentSize));
    const nextIndent = ' '.repeat(((depth + 1) * indentSize) + (initialIndent * indentSize));
    
    switch (token.type) {
      case TokenType.OpenTag:
        // Opening tag formatting
        if (!token.children || token.children.length === 0) {
          // Empty tag
          const attrs = formatAttributes(token.attributes, depth);
          result.push(`${indent}<${token.tagName}${attrs}></${token.tagName}>`);
        } 
        else if (token.children.length === 1 && 
                token.children[0].type === TokenType.Text && 
                token.children[0].content.trim().length < 40) {
          // Single short text child - format on one line
          const attrs = formatAttributes(token.attributes, depth);
          const content = token.children[0].content.trim();
          result.push(`${indent}<${token.tagName}${attrs}>${content}</${token.tagName}>`);
        }
        else {
          // Tag with multiple or complex children - multiline format
          // Handle attributes formatting
          if (shouldUseMultilineAttributes(token.attributes, token.tagName)) {
            // Multi-line attribute format
            result.push(`${indent}<${token.tagName}`);
            for (const attr of token.attributes || []) {
              result.push(`${nextIndent}${attr}`);
            }
            result.push(`${indent}>`);
          } else {
            // Single-line format for simpler tags
            const attrs = formatAttributes(token.attributes, depth);
            result.push(`${indent}<${token.tagName}${attrs}>`);
          }
          
          // Process children with proper indentation
          let lastChildType = -1;
          let lastChildIsBlock = false;
          
          for (let i = 0; i < token.children.length; i++) {
            const child = token.children[i];
            const isBlock = isBlockElement(child);
            const wasPrevBlock = lastChildIsBlock;
            
            // Add extra line break for visual separation
            if (i > 0 && (
                // Add line break between block elements
                (isBlock && wasPrevBlock) || 
                // Add line break between different component types
                (child.type !== lastChildType && 
                 child.type !== TokenType.Text && 
                 lastChildType !== TokenType.Text) ||
                // Special case for sibling components
                (child.tagName && i > 0 && token.children[i-1].tagName && 
                 child.tagName !== token.children[i-1].tagName && 
                 isTagNameCapitalized(child.tagName))
              )) {
              result.push('');
            }
            
            printToken(child, depth + 1);
            lastChildType = child.type;
            lastChildIsBlock = isBlock;
          }
          
          // Closing tag with proper indentation
          result.push(`${indent}</${token.tagName}>`);
        }
        break;
        
      case TokenType.SelfClosingTag:
        // Self-closing tag (like <img />) formatting
        const needsMultilineAttrs = shouldUseMultilineAttributes(token.attributes, token.tagName);
        
        if (needsMultilineAttrs) {
          // Multi-line attribute format for complex tags
          result.push(`${indent}<${token.tagName}`);
          for (const attr of token.attributes || []) {
            result.push(`${nextIndent}${attr}`);
          }
          result.push(`${indent}/>`);
        } else {
          // Single-line format for simpler tags
          const attrs = formatAttributes(token.attributes, depth);
          result.push(`${indent}<${token.tagName}${attrs} />`);
        }
        break;
        
      case TokenType.Text:
        // Format text with proper wrapping
        const textContent = token.content.trim();
        if (textContent) {
          if (textContent.length > 60) {
            // Long text - split into multiple lines
            const wrappedLines = wrapText(textContent, 60);
            for (const line of wrappedLines) {
              result.push(`${indent}${line}`);
            }
          } else {
            // Short text on single line
            result.push(`${indent}${textContent}`);
          }
        }
        break;
        
      case TokenType.JSXExpression:
        // Format JSX expressions
        const expression = token.content.trim();
        result.push(`${indent}${expression}`);
        break;
        
      case TokenType.Whitespace:
        // Only preserve significant whitespace
        if (token.content.includes('\n') && token.content.split('\n').length > 2) {
          result.push(''); // Add a blank line for readability
        }
        break;
        
      case TokenType.CloseTag:
        // Only for orphaned close tags
        result.push(`${indent}${token.content}`);
        break;
        
      default:
        if (token.content.trim()) {
          result.push(`${indent}${token.content.trim()}`);
        }
    }
  }
  
  // Helper to check if a token is a block-level element
  function isBlockElement(token: Token): boolean {
    if (!token) return false;
    
    // Tags that are typically block elements
    if (token.type === TokenType.OpenTag || token.type === TokenType.SelfClosingTag) {
      const blockTags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 
                        'section', 'article', 'nav', 'header', 'footer', 'form', 'img',
                        'main', 'aside', 'figure', 'figcaption'];
      return blockTags.includes(token.tagName?.toLowerCase() || '') || 
             Boolean(token.tagName?.startsWith('Button')) ||
             Boolean(token.tagName?.includes('Control')) ||
             Boolean(token.tagName?.startsWith('Header')) ||
             Boolean(token.tagName?.startsWith('Screen'));
    }
    
    return token.type === TokenType.JSXExpression;
  }
  
  // Helper to format attributes
  function formatAttributes(attributes?: string[], depth?: number): string {
    if (!attributes || attributes.length === 0) return '';
    
    // Check for Tailwind className attribute that may need special handling
    const tailwindClassNameAttr = attributes.find(attr => 
      attr.startsWith('className="') && 
      attr.includes(' ') && 
      attr.length > 60
    );
    
    if (tailwindClassNameAttr) {
      // Extract the other attributes
      const otherAttrs = attributes.filter(attr => attr !== tailwindClassNameAttr);
      
      // Format the className attribute specially
      return ' ' + (otherAttrs.length > 0 ? otherAttrs.join(' ') + ' ' : '') + tailwindClassNameAttr;
    }
    
    // Join with proper spacing
    return ' ' + attributes.join(' ');
  }
  
  // Helper to determine when to use multiline attribute formatting
  function shouldUseMultilineAttributes(attributes?: string[], tagName?: string): boolean {
    if (!attributes || attributes.length === 0) return false;
    
    // Always use multiline format for complex scenarios
    const hasRequire = attributes.some(attr => attr.includes('require('));
    const hasComplexClassName = attributes.some(attr => 
      attr.startsWith('className="') && 
      attr.includes(' ') && 
      attr.length > 60
    );
    
    if ((tagName?.toLowerCase() === 'img' && hasRequire) || 
        (tagName?.toLowerCase() === 'img' && attributes.length >= 3) ||
        hasComplexClassName) {
      return true;
    }
    
    // Use multiline format if:
    // 1. There are many attributes (more than 3)
    // 2. Any attributes are complex (contain JSX expressions)
    // 3. Combined length is long
    
    const totalLength = attributes.reduce((sum, attr) => sum + attr.length, 0);
    const hasComplexAttr = attributes.some(attr => 
      attr.includes('{') || attr.length > 40 || attr.includes('require(')
    );
    
    return attributes.length > 3 || totalLength > 80 || hasComplexAttr;
  }
  
  // Helper to wrap text at sensible boundaries
  function wrapText(text: string, maxLength: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxLength) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  // Helper to check if tag name is capitalized (likely a component)
  function isTagNameCapitalized(tagName?: string): boolean {
    if (!tagName) return false;
    return /^[A-Z]/.test(tagName);
  }
  
  // Special handling for function declarations in React components
  const codeStr = result.join('\n');
  let finalCode = '';
  
  // Process the raw tokens without building a tree structure first
  if (tokens.length === 0) return '';
  
  // Process all top-level tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Add blank line before top-level block elements (except the first one)
    if (i > 0 && isBlockElement(token) && isBlockElement(tokens[i-1])) {
      result.push('');
    }
    
    printToken(token, 0);
  }
  
  return result.join('\n');
}

/**
 * Clean up Tailwind classes by removing duplicates and unnecessary styles
 */
export function cleanupTailwindClasses(classes: string): string {
  // Split into array and remove empty strings
  let classArray = classes.split(' ').filter(Boolean);
  
  // Remove duplicate classes
  classArray = Array.from(new Set(classArray));
  
  // Apply all cleanup functions
  classArray = cleanupSizeConstraints(classArray);
  classArray = cleanupLayoutClasses(classArray);
  classArray = cleanupSpacingClasses(classArray);
  classArray = cleanupTextClasses(classArray);
  
  return classArray.join(' ');
}

/**
 * Clean up width and height constraints from Tailwind classes
 */
function cleanupSizeConstraints(classes: string[]): string[] {
  // Track if we have flex or grid layouts
  const hasFlexOrGrid = classes.some(cls => 
    cls.startsWith('flex') || 
    cls.startsWith('grid') || 
    cls === 'inline-flex' || 
    cls === 'inline-grid'
  );

  // Track if we have grow or shrink
  const hasGrowShrink = classes.some(cls => 
    cls.startsWith('grow') || 
    cls.startsWith('shrink')
  );

  // Remove fixed width/height if:
  // 1. Element is using flex/grid AND has grow/shrink
  // 2. Element has relative width (e.g., w-full)
  // 3. Width/height is set to auto
  return classes.filter(cls => {
    // Keep non-size related classes
    if (!cls.match(/^(w-|h-|min-w-|min-h-|max-w-|max-h-)/)) {
      return true;
    }

    // Always keep percentage-based and viewport-based sizes
    if (cls.includes('screen') || cls.includes('%') || cls.includes('full')) {
      return true;
    }

    // Keep min/max constraints as they're often important for layout
    if (cls.startsWith('min-') || cls.startsWith('max-')) {
      return true;
    }

    // If using flex/grid with grow/shrink, we can often remove fixed sizes
    if (hasFlexOrGrid && hasGrowShrink) {
      return false;
    }

    // Keep the class if it doesn't match our removal conditions
    return true;
  });
}

/**
 * Clean up flex and grid related classes
 */
function cleanupLayoutClasses(classes: string[]): string[] {
  // Remove redundant flex/grid properties
  const hasGrid = classes.some(cls => cls.startsWith('grid'));
  const hasFlex = classes.some(cls => cls.startsWith('flex'));

  return classes.filter(cls => {
    // If we're using grid, remove flex-related classes
    if (hasGrid && cls.startsWith('flex')) {
      return false;
    }

    // If we have flex-row, we don't need items-center (it's default)
    if (cls === 'items-center' && classes.includes('flex-row')) {
      return false;
    }

    // Remove justify-start and items-start as they're defaults
    if (cls === 'justify-start' || cls === 'items-start') {
      return false;
    }

    return true;
  });
}

/**
 * Clean up spacing classes (margin and padding)
 */
function cleanupSpacingClasses(classes: string[]): string[] {
  return classes.filter(cls => {
    // Remove zero margins and padding
    if ((cls.startsWith('m-') || cls.startsWith('p-')) && cls.endsWith('-0')) {
      return false;
    }

    return true;
  });
}

/**
 * Clean up text-related classes
 */
function cleanupTextClasses(classes: string[]): string[] {
  // Track text-specific properties
  const hasTextAlign = classes.some(cls => 
    cls.startsWith('text-') && ['left', 'center', 'right', 'justify'].some(align => cls.endsWith(align))
  );
  
  const hasSpecificWidth = classes.some(cls =>
    cls.startsWith('w-') && (cls.includes('screen') || cls.includes('%') || cls.includes('full'))
  );

  const isTextElement = classes.some(cls =>
    cls.startsWith('text-') || cls.startsWith('font-') || cls.includes('tracking-') || cls.includes('leading-')
  );

  return classes.filter(cls => {
    // Remove unnecessary text classes
    if (cls === 'leading-trim-none' || cls === 'text-left') {
      return false;
    }

    // Remove width constraints on text elements unless:
    // 1. Text is explicitly aligned
    // 2. Width is relative (%, screen, full)
    // 3. Element has specific layout requirements (flex, grid)
    if (cls.startsWith('w-') && isTextElement && !hasTextAlign && !hasSpecificWidth) {
      return false;
    }

    // Clean up font classes
    if (cls.startsWith('font-')) {
      // Remove redundant normal weights/styles
      if (cls.endsWith('-normal')) {
        return false;
      }
      
      // Convert numeric weights to semantic weights
      if (cls === 'font-400') return 'font-normal';
      if (cls === 'font-500') return 'font-medium';
      if (cls === 'font-600') return 'font-semibold';
      if (cls === 'font-700') return 'font-bold';
    }

    // Clean up line height
    if (cls.startsWith('leading-')) {
      // Remove default line heights
      if (cls === 'leading-normal') {
        return false;
      }
    }

    // Clean up letter spacing
    if (cls.startsWith('tracking-')) {
      // Remove default letter spacing
      if (cls === 'tracking-normal') {
        return false;
      }
    }

    return true;
  });
}

// Preprocess React component code to standardize function declarations
function preprocessReactComponent(code: string): string {
  // Fix function declaration format
  code = code.replace(/function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*\n\s*{/g, 'function $1() {');
  
  return code;
}

// Postprocess React component code to fix exports and overall structure
function postprocessReactComponent(code: string): string {
  // Fix export statements spacing
  code = code.replace(/}\s*\n\s*export\s+default/g, '}\n\nexport default');
  
  // Fix function declaration spacing
  code = code.replace(/function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*{/g, 'function $1() {');
  
  // Ensure consistent spacing around return statement
  code = code.replace(/return\s*\(\s*\n/g, 'return (\n');
  
  // Apply the robust indentation fix
  code = fixJsxIndentation(code);
  
  // Clean up any accidental double blank lines
  code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return code;
}

/**
 * A robust JSX indentation fixer that rebuilds the indentation structure
 * from scratch rather than trying to fix existing indentation.
 */
function fixJsxIndentation(code: string): string {
  // Split code into lines
  let lines = code.split('\n');
  
  // Find the function and return statement structure
  let returnLineIndex = -1;
  let functionIndent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('return (')) {
      returnLineIndex = i;
      functionIndent = line.match(/^(\s*)/)?.[1] || '';
      break;
    }
  }
  
  if (returnLineIndex === -1) {
    // Can't find the return statement, return the original code
    return code;
  }
  
  // Find closing parenthesis of return statement
  let closingParenIndex = -1;
  for (let i = lines.length - 1; i > returnLineIndex; i--) {
    if (lines[i].trim() === ');') {
      closingParenIndex = i;
      break;
    }
  }
  
  if (closingParenIndex === -1) {
    // Can't find the closing parenthesis, return original code
    return code;
  }
  
  // Extract JSX portion to reformat
  const jsxLines = lines.slice(returnLineIndex + 1, closingParenIndex);
  
  // Reformat the JSX with proper indentation
  // Use functionIndent + 4 spaces for the first level
  const rootIndent = functionIndent + ' '.repeat(4);
  const formattedJsx = reformatJsx(jsxLines, rootIndent);
  
  // Rebuild the result
  const result = [
    ...lines.slice(0, returnLineIndex + 1),
    ...formattedJsx,
    ...lines.slice(closingParenIndex)
  ];
  
  return result.join('\n');
}

/**
 * Reformat JSX code with proper indentation
 */
function reformatJsx(jsxLines: string[], rootIndent: string): string[] {
  const result = [];
  const tagStack = [];
  let currentIndent = rootIndent;
  let inMultilineTag = false;
  let multilineTagIndent = '';
  const INDENT_SIZE = 4; // 4 spaces per level
  
  for (let i = 0; i < jsxLines.length; i++) {
    const rawLine = jsxLines[i];
    const trimmedLine = rawLine.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      result.push('');
      continue;
    }
    
    // Check for multiline tag attributes
    if (inMultilineTag) {
      // Check if this line ends the tag
      if (trimmedLine.endsWith('/>') || trimmedLine.endsWith('>')) {
        inMultilineTag = false;
        // Use the tag indentation for closing
        result.push(multilineTagIndent + trimmedLine);
        continue;
      }
      
      // This is an attribute - indent it 4 spaces from the tag
      result.push(multilineTagIndent + ' '.repeat(INDENT_SIZE) + trimmedLine);
      continue;
    }
    
    // Handle JSX tags and content
    if (trimmedLine.startsWith('</')) {
      // Closing tag - decrease indent by removing one level
      if (currentIndent.length >= INDENT_SIZE) {
        currentIndent = currentIndent.slice(0, -INDENT_SIZE);
      }
      
      // Add the closing tag with correct indentation
      result.push(currentIndent + trimmedLine);
      
      // If there are multiple closing tags on the same line, separate them
      if (trimmedLine.match(/<\/[^>]+><\/[^>]+>/)) {
        // Split multiple closing tags
        const closingTagsMatch = trimmedLine.match(/<\/[^>]+>/g);
        if (closingTagsMatch && closingTagsMatch.length > 1) {
          // Remove the combined line we just added
          result.pop();
          
          // Add each closing tag on its own line with proper indentation
          for (let j = 0; j < closingTagsMatch.length; j++) {
            result.push(currentIndent + closingTagsMatch[j]);
            // Decrease indent for subsequent closing tags
            if (j < closingTagsMatch.length - 1 && currentIndent.length >= INDENT_SIZE) {
              currentIndent = currentIndent.slice(0, -INDENT_SIZE);
            }
          }
        }
      }
    }
    else if (trimmedLine.startsWith('<') && !trimmedLine.endsWith('/>') && !trimmedLine.endsWith('>')) {
      // Start of multiline tag - save current indent
      inMultilineTag = true;
      multilineTagIndent = currentIndent;
      
      // Add the opening part of the tag
      result.push(currentIndent + trimmedLine);
    }
    else if (trimmedLine.startsWith('<') && !trimmedLine.startsWith('</')) {
      // Opening tag
      result.push(currentIndent + trimmedLine);
      
      // Don't increase indent for self-closing tags
      if (!trimmedLine.endsWith('/>')) {
        // Add one level of indentation
        currentIndent += ' '.repeat(INDENT_SIZE);
      }
    }
    else {
      // Text content or expressions
      result.push(currentIndent + trimmedLine);
    }
  }
  
  return result;
}

/**
 * Direct JSX formatting with sensible, consistent indentation
 */
function directJsxFormat(code: string, initialIndent: number = 0): string {
  // First, normalize line breaks
  code = code.replace(/\r\n/g, '\n');
  
  // Split into lines for processing
  const lines = code.split('\n');
  const result = [];
  
  // Track function and return locations
  let inFunction = false;
  let inReturnJsx = false;
  let functionIndent = '';
  let jsxIndent = '';
  
  // Track tag nesting
  let tagLevel = 0;
  let inMultilineTag = false;
  let multilineTagIndent = '';
  
  // Standard indent is 4 spaces
  const INDENT_SIZE = 4;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines but preserve them
    if (!trimmedLine) {
      result.push('');
      continue;
    }
    
    // Detect function boundaries
    if (trimmedLine.startsWith('function ') && trimmedLine.includes('{')) {
      inFunction = true;
      functionIndent = line.match(/^(\s*)/)?.[1] || '';
      result.push(line);
      continue;
    }
    
    // Detect return statement
    if (inFunction && trimmedLine.startsWith('return (')) {
      inReturnJsx = true;
      jsxIndent = functionIndent + ' '.repeat(INDENT_SIZE);
      result.push(line);
      continue;
    }
    
    // Exit JSX mode on closing parenthesis of return
    if (inReturnJsx && trimmedLine === ');') {
      inReturnJsx = false;
      result.push(functionIndent + trimmedLine);
      continue;
    }
    
    // Exit function on closing brace
    if (inFunction && trimmedLine === '}') {
      inFunction = false;
      // Special case for export default pattern
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('export default')) {
        result.push('');
      }
      result.push(functionIndent + trimmedLine);
      continue;
    }
    
    // Handle export default
    if (trimmedLine.startsWith('export default')) {
      result.push(line);
      continue;
    }
    
    // Special handling for JSX content
    if (inReturnJsx) {
      // Calculate the proper indent for this line
      let currentIndent = jsxIndent + ' '.repeat(tagLevel * INDENT_SIZE);
      
      // Check for multiline tag attributes
      if (inMultilineTag) {
        // Check if this line ends the tag
        if (trimmedLine.endsWith('/>') || trimmedLine.endsWith('>')) {
          inMultilineTag = false;
          result.push(multilineTagIndent + trimmedLine);
          continue;
        }
        
        // This is an attribute - indent consistently
        result.push(multilineTagIndent + ' '.repeat(INDENT_SIZE) + trimmedLine);
        continue;
      }
      
      // Process based on line content
      if (trimmedLine.startsWith('</')) {
        // This is a closing tag, reduce indent level
        tagLevel = Math.max(0, tagLevel - 1);
        currentIndent = jsxIndent + ' '.repeat(tagLevel * INDENT_SIZE);
        result.push(currentIndent + trimmedLine);
      }
      else if (trimmedLine.startsWith('<') && !trimmedLine.endsWith('/>') && !trimmedLine.endsWith('>')) {
        // Start of a multiline tag (tag with attributes on multiple lines)
        inMultilineTag = true;
        multilineTagIndent = jsxIndent + ' '.repeat(tagLevel * INDENT_SIZE);
        result.push(multilineTagIndent + trimmedLine);
      }
      else if (trimmedLine.startsWith('<') && !trimmedLine.startsWith('</')) {
        // Opening tag - add to output
        result.push(currentIndent + trimmedLine);
        
        // Increase indent for children only if not self-closing
        if (!trimmedLine.endsWith('/>')) {
          tagLevel++;
        }
      }
      else {
        // Regular content
        result.push(currentIndent + trimmedLine);
      }
    } 
    else {
      // Non-JSX content - preserve as is
      result.push(line);
    }
  }
  
  // Join all lines and clean up any double blank lines
  return result.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n');
} 