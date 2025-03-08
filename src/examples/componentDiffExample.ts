import { analyzeCardComponent, analyzeBottomComponent } from '../utils/variantAnalyzer';
import { diffTailwindClasses } from '../utils/diffUtils';

/**
 * Example showing how to use the variant analyzers on the Bottom component
 */
export function analyzeBottomComponentExample(componentCode: string): void {
  // Simulate extracting render functions from a component
  const renderFunctions: Record<string, string> = {
    'property 1=Icon+Not Parking': `
    <div className="w-[93px] h-[20px] flex flex-row justify-start items-center grow-0 overflow-visible gap-1 p-0 rounded-none">
        <div className="w-[93px] h-[20px] flex flex-row justify-start items-center grow-0 overflow-visible gap-1 p-0 rounded-none">
            <div className="w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                <div className="bg-modal-dark-legacy w-[16px] h-[15px] grow-0 rounded-none"></div>
            </div>
            <span className="bg-modal-dark-legacy text-[#393732] text-sm w-[69px] h-[20px] grow-0 space-y-[0px] leading-trim-none">No Parking</span>
        </div>
    </div>
    <div className="w-[116px] h-[28px] flex flex-row justify-end items-center self-stretch grow-0 overflow-visible gap-3 pt-1 pr-0 pb-1 pl-0 rounded-sm">
        <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
            <div className="w-[19px] h-[20px] grow-0">
                <div className="w-[11px] h-[19px] grow-0 rounded-none"></div>
                <div className="bg-modal-dark-legacy w-[7px] h-[17px] grow-0 rounded-none">
                    <div className="bg-modal-dark-legacy w-[7px] h-[17px] grow-0 rounded-none"></div>
                    <div className="bg-true-white w-[2px] h-[3px] grow-0 rounded-none"></div>
                </div>
                <div className="w-[12px] h-[0px] grow-0"></div>
            </div>
        </div>
        <div className="w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-visible p-0 rounded-none">
            <div className="w-[18px] h-[0px] grow-0 rounded-none"></div>
            <div className="w-[3px] h-[4px] grow-0 rounded-none"></div>
            <div className="w-[15px] h-[11px] grow-0 rounded-none"></div>
            <div className="w-[2px] h-[5px] grow-0 rounded-none"></div>
            <div className="w-[2px] h-[5px] grow-0 rounded-none"></div>
        </div>
        <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-visible p-0 rounded-none">
            <div className="bg-modal-dark-legacy w-[20px] h-[20px] grow-0 rounded-none"></div>
        </div>
        <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
            <div className="w-[3px] h-[3px] grow-0 rounded-none"></div>
            <div className="w-[3px] h-[3px] grow-0 rounded-none"></div>
            <div className="w-[6px] h-[15px] grow-0 rounded-none"></div>
            <div className="w-[15px] h-[9px] grow-0 rounded-none"></div>
            <div className="w-[7px] h-[0px] grow-0 rounded-none"></div>
        </div>
    </div>`,
    'property 1=Price + Camptype': `
    <span className="bg-modal-dark-legacy font-small-small-regular-normal text-small-small-regular-normal leading-small-small-regular-normal tracking-small-small-regular-normal w-[102px] h-[20px] grow-0 space-y-[0px] leading-trim-none">From $50/Night</span>
    <div className="w-[110px] h-[28px] flex flex-row justify-end items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
        <div className="w-[110px] h-[28px] flex flex-row justify-start items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
            <div className="w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-visible p-0 rounded-none">
                <div className="bg-modal-dark-legacy w-[20px] h-[20px] grow-0 rounded-none"></div>
                <div className="w-[20px] h-[17px] grow-0">
                    <div className="bg-modal-dark-legacy w-[15px] h-[13px] grow-0 rounded-none"></div>
                    <div className="bg-modal-dark-legacy w-[11px] h-[12px] grow-0 rounded-none"></div>
                </div>
            </div>
            <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                <div className="w-[17px] h-[15px] grow-0">
                    <div className="w-[16px] h-[15px] grow-0 rounded-none"></div>
                    <div className="w-[17px] h-[7px] grow-0"></div>
                </div>
            </div>
            <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none">
                    <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                    <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                </div>
            </div>
            <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                <div className="w-[25px] h-[16px] grow-0">
                    <div className="w-[25px] h-[16px] grow-0">
                        <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`
  };

  // Analyze the render content and extract the differences
  const { parameterizedTemplate, variantMappings } = analyzeCardComponent(
    renderFunctions, 
    ['property 1']
  );

  // Log the changes found between variants
  console.log('--- Bottom Component Analysis ---');
  console.log('Elements changed by property 1:', variantMappings['property 1']);
  
  // Example showing tailwind class differences
  if (variantMappings['property 1']['Price + Camptype']) {
    const classChanges = variantMappings['property 1']['Price + Camptype'].classChanges;
    console.log('Class changes for Price + Camptype variant:');
    classChanges.forEach((change: { path: string; diff: { added: string[]; removed: string[]; unchanged: string[] } }) => {
      console.log(`Element path: ${change.path}`);
      console.log(` - Added classes: ${change.diff.added.join(', ')}`);
      console.log(` - Removed classes: ${change.diff.removed.join(', ')}`);
    });
  }

  // Example showing generated parameterized template
  console.log('Parameterized template:');
  console.log(parameterizedTemplate);
}

/**
 * Example showing how to use the variant analyzers on the CardCampground component
 * which has multiple variant properties
 */
export function analyzeCardCampgroundExample(): void {
  // Simulate extracting render functions from the component with two properties
  const renderFunctions: Record<string, string> = {
    'ratings=False:show_image=False': `
    <div className="w-[353px] h-[114px] flex flex-col justify-start items-start self-stretch grow overflow-visible pt-4 pr-0 pb-3 pl-0 rounded-none">
        <div className="w-[353px] h-[46px] flex flex-col justify-start items-start self-stretch grow-0 overflow-visible pt-0 pr-8 pb-0 pl-0 rounded-none">
            <div className="w-[321px] h-[18px] flex flex-row justify-start items-center self-stretch grow-0 overflow-visible gap-24 p-0 rounded-none">
                <div className="w-[104px] h-[14px] flex flex-row justify-start items-center grow-0 overflow-visible gap-1 p-0 rounded-none"><span className="bg-primary font-small-small-semi-loose text-small-small-semi-loose leading-small-small-semi-loose tracking-small-small-semi-loose w-[104px] h-[14px] grow-0 space-y-[0px] leading-trim-none">CAMPGROUND</span>
                </div>
            </div>
            <div className="bg-true-white w-[321px] h-[28px] flex flex-row justify-start items-center self-stretch grow-0 overflow-visible gap-2 pt-1 pr-0 pb-1 pl-0 rounded-none"><span className="bg-text-primary-text font-title-5 text-title-5 leading-title-5 tracking-title-5 w-[321px] h-[20px] grow space-y-[0px] leading-trim-none">{Title}</span>
            </div>
        </div>
        <div className="w-[353px] h-[40px] flex flex-col justify-start items-start self-stretch grow-0 overflow-visible pt-2 pr-0 pb-2 pl-0 rounded-none">
            <div className="w-[353px] h-[24px] flex flex-row justify-space-between items-center self-stretch grow-0 overflow-visible gap-3 p-0 rounded-sm"><span className="bg-modal-dark-legacy font-small-small-regular-normal text-small-small-regular-normal leading-small-small-regular-normal tracking-small-small-regular-normal w-[102px] h-[20px] grow-0 space-y-[0px] leading-trim-none">From $50/Night</span>
                <div className="w-[110px] h-[28px] flex flex-row justify-end items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
                    <div className="w-[110px] h-[28px] flex flex-row justify-start items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
                        <div className="w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-visible p-0 rounded-none">
                            <div className="bg-modal-dark-legacy w-[20px] h-[20px] grow-0 rounded-none"></div>
                            <div className="w-[20px] h-[17px] grow-0">
                                <div className="bg-modal-dark-legacy w-[15px] h-[13px] grow-0 rounded-none"></div>
                                <div className="bg-modal-dark-legacy w-[11px] h-[12px] grow-0 rounded-none"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="w-[17px] h-[15px] grow-0">
                                <div className="w-[16px] h-[15px] grow-0 rounded-none"></div>
                                <div className="w-[17px] h-[7px] grow-0"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none">
                                <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                                <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="w-[25px] h-[16px] grow-0">
                                <div className="w-[25px] h-[16px] grow-0">
                                    <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    'ratings=True:show_image=False': `
    <div className="w-[353px] h-[146px] flex flex-col justify-start items-start self-stretch grow overflow-visible pt-4 pr-0 pb-3 pl-0 rounded-none">
        <div className="w-[353px] h-[50px] flex flex-col justify-start items-start self-stretch grow-0 overflow-visible gap-1 pt-0 pr-8 pb-0 pl-0 rounded-none">
            <div className="w-[321px] h-[18px] flex flex-row justify-start items-center self-stretch grow-0 overflow-visible gap-24 p-0 rounded-none">
                <div className="w-[104px] h-[14px] flex flex-row justify-start items-center grow-0 overflow-visible gap-1 p-0 rounded-none"><span className="bg-primary font-small-small-semi-loose text-small-small-semi-loose leading-small-small-semi-loose tracking-small-small-semi-loose w-[104px] h-[14px] grow-0 space-y-[0px] leading-trim-none">CAMPGROUND</span>
                </div>
            </div>
            <div className="bg-true-white w-[321px] h-[28px] flex flex-row justify-start items-center self-stretch grow-0 overflow-visible gap-2 pt-1 pr-0 pb-1 pl-0 rounded-none"><span className="bg-text-primary-text font-title-5 text-title-5 leading-title-5 tracking-title-5 w-[321px] h-[20px] grow space-y-[0px] leading-trim-none">{Title}</span>
            </div>
        </div>
        <div className="w-[353px] h-[68px] flex flex-col justify-start items-start self-stretch grow-0 overflow-visible pt-2 pr-0 pb-2 pl-0 rounded-none">
            <div className="w-[353px] h-[24px] flex flex-row justify-space-between items-center self-stretch grow-0 overflow-visible gap-3 p-0 rounded-sm"><span className="bg-modal-dark-legacy font-small-small-regular-normal text-small-small-regular-normal leading-small-small-regular-normal tracking-small-small-regular-normal w-[102px] h-[20px] grow-0 space-y-[0px] leading-trim-none">From $50/Night</span>
                <div className="w-[110px] h-[28px] flex flex-row justify-end items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
                    <div className="w-[110px] h-[28px] flex flex-row justify-start items-center grow-0 overflow-visible gap-[5px] p-0 rounded-none">
                        <div className="w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-visible p-0 rounded-none">
                            <div className="bg-modal-dark-legacy w-[20px] h-[20px] grow-0 rounded-none"></div>
                            <div className="w-[20px] h-[17px] grow-0">
                                <div className="bg-modal-dark-legacy w-[15px] h-[13px] grow-0 rounded-none"></div>
                                <div className="bg-modal-dark-legacy w-[11px] h-[12px] grow-0 rounded-none"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[20px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="w-[17px] h-[15px] grow-0">
                                <div className="w-[16px] h-[15px] grow-0 rounded-none"></div>
                                <div className="w-[17px] h-[7px] grow-0"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none">
                                <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                                <div className="bg-modal-dark-legacy w-[26px] h-[17px] grow-0 rounded-none"></div>
                            </div>
                        </div>
                        <div className="bg-true-white w-[28px] h-[20px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="w-[25px] h-[16px] grow-0">
                                <div className="w-[25px] h-[16px] grow-0">
                                    <div className="bg-modal-dark-legacy w-[25px] h-[16px] grow-0 rounded-none"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-[353px] h-[28px] flex flex-row justify-start items-center self-stretch grow-0 overflow-visible gap-3 pt-1.5 pr-0 pb-1.5 pl-0 rounded-sm">
                <div className="w-[165px] h-[16px] flex flex-row justify-start items-center grow-0 overflow-visible gap-1 p-0 rounded-none">
                    <div className="w-[18px] h-[16px] flex flex-row justify-start items-start grow-0 overflow-visible gap-[5px] p-0 rounded-none"><span className="bg-modal-dark-legacy font-caption-xs-caption-1-regular text-caption-xs-caption-1-regular leading-caption-xs-caption-1-regular tracking-caption-xs-caption-1-regular w-[18px] h-[16px] grow-0 space-y-[0px] leading-trim-none">4.8</span>
                    </div>
                    <div className="w-[76px] h-[12px] flex flex-row justify-start items-start grow-0 overflow-visible gap-1 p-0 rounded-none">
                        <div className="w-[12px] h-[12px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-star w-[11px] h-[11px] grow-0 rounded-none"></div>
                        </div>
                        <div className="w-[12px] h-[12px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-star w-[11px] h-[11px] grow-0 rounded-none"></div>
                        </div>
                        <div className="w-[12px] h-[12px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-star w-[11px] h-[11px] grow-0 rounded-none"></div>
                        </div>
                        <div className="w-[12px] h-[12px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-star w-[11px] h-[11px] grow-0 rounded-none"></div>
                        </div>
                        <div className="w-[12px] h-[12px] flex flex-col justify-start items-start grow-0 overflow-hidden p-0 rounded-none">
                            <div className="bg-star w-[11px] h-[11px] grow-0 rounded-none"></div>
                        </div>
                    </div>
                    <div className="w-[63px] h-[16px] flex flex-row justify-start items-start grow-0 overflow-visible gap-[5px] p-0 rounded-none"><span className="bg-modal-dark-legacy font-caption-xs-caption-1-regular text-caption-xs-caption-1-regular leading-caption-xs-caption-1-regular tracking-caption-xs-caption-1-regular w-[63px] h-[16px] grow-0 space-y-[0px] leading-trim-none">36 Reviews</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`
  };

  // Analyze the render content and extract the differences
  const { parameterizedTemplate, variantMappings } = analyzeCardComponent(
    renderFunctions, 
    ['ratings', 'show_image']
  );

  // Isolate the impact of specific properties
  console.log('--- CardCampground Component Analysis ---');
  
  // Effects of "ratings" property
  if (variantMappings['ratings'] && variantMappings['ratings']['True']) {
    console.log('Impact of ratings=True:');
    console.log('- Changed elements:', variantMappings['ratings']['True'].changedElements.length);
    
    // Show exemplar class changes for a specific element
    if (variantMappings['ratings']['True'].classChanges.length > 0) {
      const firstChange = variantMappings['ratings']['True'].classChanges[0];
      console.log('Example class change:');
      console.log('- Path:', firstChange.path);
      console.log('- Added classes:', firstChange.diff.added);
      console.log('- Removed classes:', firstChange.diff.removed);
    }
  }

  // Show how the component structure changed
  console.log('\nKey structural differences found:');
  Object.keys(variantMappings).forEach(propName => {
    Object.keys(variantMappings[propName]).forEach(propValue => {
      console.log(`When ${propName}=${propValue}:`);
      const changes = variantMappings[propName][propValue];
      console.log(`- ${changes.changedElements.length} elements with modified classes`);
      
      // Show a sample of what changed
      if (changes.classChanges.length > 0) {
        // Group changes by similar patterns
        const changePatterns: Record<string, { count: number, examples: string[] }> = {};
        
        changes.classChanges.forEach((change: { path: string; diff: { added: string[]; removed: string[]; unchanged: string[] } }) => {
          const patternKey = `added: ${change.diff.added.length}, removed: ${change.diff.removed.length}`;
          if (!changePatterns[patternKey]) {
            changePatterns[patternKey] = { count: 0, examples: [] };
          }
          changePatterns[patternKey].count++;
          if (changePatterns[patternKey].examples.length < 2) {
            changePatterns[patternKey].examples.push(change.path);
          }
        });
        
        // Show change patterns
        Object.entries(changePatterns).forEach(([pattern, { count, examples }]) => {
          console.log(`  - ${pattern} (${count} occurrences, e.g. at ${examples.join(', ')})`);
        });
      }
    });
  });
}

// Usage examples
export function runDiffExamples(): void {
  // Example showing diffing of tailwind classes
  const oldClasses = "w-[353px] h-[114px] flex flex-col justify-start items-start self-stretch grow overflow-visible pt-4 pr-0 pb-3 pl-0 rounded-none";
  const newClasses = "w-[353px] h-[146px] flex flex-col justify-start items-start self-stretch grow overflow-visible pt-4 pr-0 pb-3 pl-0 rounded-none";
  
  const classDiff = diffTailwindClasses(oldClasses, newClasses);
  
  console.log('Tailwind class diff:');
  console.log('- Added:', classDiff.added);
  console.log('- Removed:', classDiff.removed);
  console.log('- Unchanged:', classDiff.unchanged);
  
  // Run component analysis examples
  analyzeBottomComponentExample('');
  analyzeCardCampgroundExample();
} 