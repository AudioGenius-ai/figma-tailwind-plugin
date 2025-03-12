/**
 * Clean up Tailwind classes to ensure they're properly formatted
 */
export function cleanupTailwindClasses(classes: string): string {
  if (!classes) return '';
  
  // Split into array for processing
  const classArray = classes.split(' ').filter(Boolean);
  
  // Remove duplicate classes
  const uniqueClasses = Array.from(new Set(classArray));
  
  // Handle conflicting classes (e.g., multiple bg-* classes)
  const prefixGroups: Record<string, string[]> = {
    'bg-': [],
    'text-': [],
    'p-': [],
    'm-': [],
    'w-': [],
    'h-': [],
    'flex-': [],
    'rounded-': [],
    'bg-image': [] // Add this to avoid the TypeScript error
  };
  
  // Store classes by their prefix groups
  uniqueClasses.forEach(cls => {
    // Special case for background images - always keep these
    if (cls.includes('bg-[image:') || cls.includes('bg-[url(')) {
      prefixGroups['bg-image'].push(cls);
      return;
    }
    
    // For other classes, group by prefix
    for (const prefix of Object.keys(prefixGroups)) {
      if (cls.startsWith(prefix)) {
        prefixGroups[prefix].push(cls);
        return;
      }
    }
  });
  
  // Handle each prefix group independently
  Object.keys(prefixGroups).forEach(prefix => {
    // If we have both regular bg-* classes and bg-image classes,
    // we should keep both for layering
    if (prefix === 'bg-' && prefixGroups['bg-image'] && prefixGroups['bg-image'].length > 0) {
      // No conflict resolution needed, keep both
      return;
    }
    
    // For other prefixes, if we have multiple classes with the same prefix,
    // only keep the last one (most specific) to avoid conflicts
    if (prefixGroups[prefix].length > 1) {
      prefixGroups[prefix] = [prefixGroups[prefix][prefixGroups[prefix].length - 1]];
    }
  });
  
  // Flatten the prefix groups back into a single array
  const cleanedClasses: string[] = [];
  
  // First add all background image classes
  if (prefixGroups['bg-image']) {
    cleanedClasses.push(...prefixGroups['bg-image']);
  }
  
  // Then add classes from other prefix groups
  Object.keys(prefixGroups).forEach(prefix => {
    if (prefix !== 'bg-image') {
      cleanedClasses.push(...prefixGroups[prefix]);
    }
  });
  
  // Add any remaining classes that weren't in prefix groups
  uniqueClasses.forEach(cls => {
    if (!Object.keys(prefixGroups).some(prefix => cls.startsWith(prefix)) &&
        !cls.includes('bg-[image:') && !cls.includes('bg-[url(')) {
      cleanedClasses.push(cls);
    }
  });
  
  return cleanedClasses.join(' ');
} 