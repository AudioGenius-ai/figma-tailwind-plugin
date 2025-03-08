import { DesignTokenMap } from '../types/styleTypes';
import { LayoutGrid, GridLayoutGrid, RowsLayoutGrid, ColumnsLayoutGrid } from '../types/figmaTypes';

export async function processGridStyles(designTokenMap: DesignTokenMap): Promise<void> {
  try {
    const gridStyles = await figma.getLocalGridStylesAsync();
    gridStyles.forEach(style => {
      try {
        const tailwindClasses: string[] = [];

        style.layoutGrids.forEach(grid => {
          if (!grid.visible) return;
          processGrid(grid as LayoutGrid, tailwindClasses);
        });

        // Add base grid class if any grid is defined
        if (tailwindClasses.length > 0) {
          tailwindClasses.unshift('grid');
        }

        // Store the generated classes
        if (tailwindClasses.length > 0) {
          designTokenMap.spacing[style.name] = tailwindClasses.join(' ');
        }
      } catch (error) {
        console.error(`Error processing grid style ${style.name}:`, error);
      }
    });
  } catch (error) {
    console.error('Error processing grid styles:', error);
    throw error;
  }
}

function processGrid(grid: LayoutGrid, tailwindClasses: string[]): void {
  try {
    switch (grid.pattern) {
      case 'ROWS':
        processRowGrid(grid as RowsLayoutGrid, tailwindClasses);
        break;

      case 'COLUMNS':
        processColumnGrid(grid as ColumnsLayoutGrid, tailwindClasses);
        break;

      case 'GRID':
        processGridLayout(grid as GridLayoutGrid, tailwindClasses);
        break;
    }
  } catch (error) {
    console.error('Error processing grid:', error);
  }
}

function processRowGrid(grid: RowsLayoutGrid, tailwindClasses: string[]): void {
  // Handle row-based grid
  const rowGap = Math.round(grid.gutterSize / 4);
  tailwindClasses.push(`gap-y-${rowGap}`);

  // Handle row alignment
  processGridAlignment(grid.alignment, tailwindClasses, 'row');

  // Handle row count if specified
  if (grid.count > 1) {
    tailwindClasses.push(`grid-rows-${grid.count}`);
  }

  // Handle section size if specified (row height)
  if (grid.sectionSize) {
    const rowHeight = Math.round(grid.sectionSize / 4);
    tailwindClasses.push(`auto-rows-[${rowHeight}px]`);
  }

  // Handle offset if specified
  if (grid.offset) {
    const offsetY = Math.round(grid.offset / 4);
    tailwindClasses.push(`mt-${offsetY}`);
  }
}

function processColumnGrid(grid: ColumnsLayoutGrid, tailwindClasses: string[]): void {
  // Handle column-based grid
  const colGap = Math.round(grid.gutterSize / 4);
  tailwindClasses.push(`gap-x-${colGap}`);

  // Handle column alignment
  processGridAlignment(grid.alignment, tailwindClasses, 'column');

  // Handle column count if specified
  if (grid.count > 1) {
    tailwindClasses.push(`grid-cols-${grid.count}`);
  }

  // Handle section size if specified (column width)
  if (grid.sectionSize) {
    const colWidth = Math.round(grid.sectionSize / 4);
    tailwindClasses.push(`auto-cols-[${colWidth}px]`);
  }

  // Handle offset if specified
  if (grid.offset) {
    const offsetX = Math.round(grid.offset / 4);
    tailwindClasses.push(`ml-${offsetX}`);
  }
}

function processGridLayout(grid: GridLayoutGrid, tailwindClasses: string[]): void {
  // Handle grid layout
  const gridSize = Math.round(grid.sectionSize / 4);
  
  // Create a responsive grid with equal-sized cells
  tailwindClasses.push('grid');
  tailwindClasses.push(`grid-cols-[repeat(auto-fill,minmax(${gridSize}px,1fr))]`);
  tailwindClasses.push(`gap-${gridSize}`);
}

function processGridAlignment(alignment: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH', tailwindClasses: string[], type: 'row' | 'column'): void {
  if (type === 'row') {
    switch (alignment) {
      case 'MIN':
        tailwindClasses.push('items-start');
        break;
      case 'CENTER':
        tailwindClasses.push('items-center');
        break;
      case 'MAX':
        tailwindClasses.push('items-end');
        break;
      case 'STRETCH':
        tailwindClasses.push('items-stretch');
        break;
    }
  } else {
    switch (alignment) {
      case 'MIN':
        tailwindClasses.push('justify-start');
        break;
      case 'CENTER':
        tailwindClasses.push('justify-center');
        break;
      case 'MAX':
        tailwindClasses.push('justify-end');
        break;
      case 'STRETCH':
        tailwindClasses.push('justify-stretch');
        break;
    }
  }
} 