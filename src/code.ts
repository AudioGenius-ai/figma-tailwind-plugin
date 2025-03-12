// This plugin will generate React components with Tailwind CSS from Figma designs
// Code in this file has access to the Figma document via the figma global object

import { extractDesignTokens } from './services/designTokenExtractor';
import { generateCssVariables } from './transformers/tokensToCSS';
import { generateTailwindConfig } from './transformers/tokensToTailwind';
import { generateReactComponent } from './services/componentGenerator';
import { PaymentStatus } from './types/figmaTypes';

// Map to store pending format requests
const formatRequests = new Map();

// Constants for subscription
const FREE_INSPECTION_LIMIT = 50;
const STORAGE_KEY_USAGE_COUNT = 'reactTailwindGenerator_usageCount';
const STORAGE_KEY_HAS_SUBSCRIPTION = 'reactTailwindGenerator_hasSubscription';

figma.payments?.setPaymentStatusInDevelopment({ type: 'PAID' });


// Initialize the plugin with UI
figma.showUI(__html__, { visible: false });

// Simple run handler that just shows plugin status, doesn't handle payment

// Function to handle subscription purchase
async function initiateSubscriptionPurchase() {
  try {
    // Check if payments API is available
    if (!figma.payments) {
      throw new Error("Payments API is not available in this context");
    }
    
    // Show a message before initiating the payment flow
    figma.notify('Starting subscription process...');
    
    // Keep the plugin running with an invisible UI    
    // Initiate the checkout process
    await figma.payments.initiateCheckoutAsync({
      interstitial: 'PAID_FEATURE' // Indicate that the free trial has ended
    });
    
    // After the checkout completes (user either pays or cancels),
    // check the payment status
    if (figma.payments.status.type === 'PAID') {
      await figma.clientStorage.setAsync(STORAGE_KEY_HAS_SUBSCRIPTION, true);
      figma.notify('Subscription activated successfully! You now have unlimited access.');
    } else {
      // User canceled or payment failed
      figma.notify('You need a subscription to use this plugin beyond the free trial.');
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    figma.notify('There was an error processing your subscription. Please try again.');
  }
  // No finally block with figma.closePlugin() - keep the plugin running
}

// Listen for messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'FORMAT_RESULT') {
    const { id, result } = msg;
    const resolve = formatRequests.get(id);
    if (resolve) {
      resolve(result);
      formatRequests.delete(id);
    }
  } else if (msg.type === 'DOWNLOAD_COMPLETE') {
    // Handle download complete notification
    console.log('Assets download completed');
  }
};

// Function to format code using the UI thread
async function formatCodeInUI(code: string, language: 'HTML' | 'CSS' | 'JSON' | 'JAVASCRIPT' | 'TYPESCRIPT'): Promise<string> {
  return new Promise((resolve) => {
    const id = Date.now().toString();
    formatRequests.set(id, resolve);
    
    figma.ui.postMessage({
      type: 'FORMAT',
      id,
      language,
      code
    });
  });
}

// Function to check if user has exceeded free usage and doesn't have a subscription
async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    // First check if the user has already paid via Figma's payments API
    if (figma.payments && figma.payments.status.type === 'PAID') {
      console.log('User has PAID status via Figma payments API');
    // Ensure our local storage is synced with Figma's payment status
    await figma.clientStorage.setAsync(STORAGE_KEY_HAS_SUBSCRIPTION, true);
    return true;
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
    const hasSubscription = await figma.clientStorage.getAsync(STORAGE_KEY_HAS_SUBSCRIPTION) || false;
    if (hasSubscription) {
      console.log('User has subscription via client storage');
      return true;
    }
  }
    
  // Get current usage count
  const usageCount = await figma.clientStorage.getAsync(STORAGE_KEY_USAGE_COUNT);
  console.log('Current usage count from storage:', usageCount);
  
  // Ensure usageCount is a number and not null/undefined
  const safeUsageCount = typeof usageCount === 'number' ? usageCount : 0;
  
  // If this is the first time or counter was not set properly
  if (usageCount === null || usageCount === undefined) {
    console.log('Initializing usage count to 0 (first run)');
    await figma.clientStorage.setAsync(STORAGE_KEY_USAGE_COUNT, 0);
    return true; // First-time users always get access
  }
  
  // Check if user still has free inspections
  const remainingFree = FREE_INSPECTION_LIMIT - safeUsageCount;
  
  // If user hasn't used all free inspections, they can continue
  if (remainingFree > 0) {
    console.log(`User has ${remainingFree} inspections remaining`);
    return true;
  }
  
  console.log('User has exceeded free limit and doesn\'t have subscription');
  // User has exceeded free limit and doesn't have subscription
  return false;
}

// Function to increment usage count
async function incrementUsageCount(): Promise<number> {
  // Get current count
  const currentCount = await figma.clientStorage.getAsync(STORAGE_KEY_USAGE_COUNT);
  console.log('Current count before increment:', currentCount);
  
  // Ensure it's a number
  const safeCurrentCount = typeof currentCount === 'number' ? currentCount : 0;
  
  // Increment and save
  const newCount = safeCurrentCount + 1;
  await figma.clientStorage.setAsync(STORAGE_KEY_USAGE_COUNT, newCount);
  console.log('New count after increment:', newCount);
  
  return newCount;
}

figma.codegen.on('generate', async (event) => {
  try {
    console.log('Codegen event triggered - checking subscription status');
    const node = event.node;
    
    // Check if user can generate code (either has subscription or free inspections left)
    const canUsePlugin = await checkSubscriptionStatus();
    console.log('Can use plugin?', canUsePlugin);
    
    if (!canUsePlugin) {
      console.log('User needs to subscribe');
      // User has exceeded free limit and doesn't have subscription
      // We can't directly call payment methods in the codegen context
      return [{
        title: 'Subscription Required',
        code: `You've used your ${FREE_INSPECTION_LIMIT} free inspections. 

To subscribe:
1. Click on the plugin in the main Figma menu (Plugins > React Tailwind Generator)
2. The subscription process will start automatically

Thank you for using React Tailwind Generator!`,
        language: 'PLAINTEXT',
      }];
    }
    
    // Only increment usage if user doesn't have a subscription
    // Check both Figma payments API and our local storage
    const isPaid = figma.payments && figma.payments.status.type === 'PAID';
    const hasSubscription = isPaid || await figma.clientStorage.getAsync(STORAGE_KEY_HAS_SUBSCRIPTION) || false;
    console.log('User has subscription?', hasSubscription);
    
    if (!hasSubscription) {
      console.log('Incrementing usage for non-subscribed user');
      const newCount = await incrementUsageCount();
      const remainingFree = Math.max(0, FREE_INSPECTION_LIMIT - newCount);
      console.log(`After increment: ${remainingFree} inspections remaining`);
      console.log(`Remaining free inspections: ${remainingFree} ${remainingFree > 0}`);
      if (remainingFree > 0) {
        figma.notify(`You have ${remainingFree} free inspection${remainingFree === 1 ? '' : 's'} remaining.`);
      } else if (remainingFree === 0) {
        figma.notify('This is your last free inspection. Next time you will need a subscription.');
        initiateSubscriptionPurchase();

      }
    }
    
    // Extract design tokens
    const tokens = await extractDesignTokens();
    
    // Generate CSS variables
    const cssVariables = await generateCssVariables(tokens);
    
    // Generate Tailwind config
    const tailwindConfig = await generateTailwindConfig(tokens);
    
    // Generate the React component
    const rawReactCode = await generateReactComponent(node, tokens, true);
    
    // Format each code snippet using the UI thread
    const formattedReactCode = await formatCodeInUI(rawReactCode, 'TYPESCRIPT');
    const formattedCssVariables = await formatCodeInUI(cssVariables, 'CSS');
    const formattedTailwindConfig = await formatCodeInUI(tailwindConfig, 'TYPESCRIPT');
    
    // Return an array of CodegenResult objects
    return [
      {
        title: 'React + Tailwind',
        code: formattedReactCode,
        language: 'TYPESCRIPT',
      },
      {
        title: 'CSS Variables',
        code: formattedCssVariables,
        language: 'CSS',
      },
      {
        title: 'Tailwind Config',
        code: formattedTailwindConfig,
        language: 'JAVASCRIPT',
      }
    ];
  } catch (error: unknown) {
    console.error('Error in codegen:', error);
    return [{
      title: 'Error',
      code: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
      language: 'PLAINTEXT',
    }];
  }
});


function hasValidSelection(nodes: readonly SceneNode[]): boolean {
  return !(!nodes || nodes.length === 0)
}

figma.codegen.on('preferenceschange', async (event) => {
  console.log('Preferences changed:', event);

  if (event.propertyName === 'downloadAssets') {
    const { selection } = figma.currentPage

    if (hasValidSelection(selection)) {
      try {
        // Define the type for exportable bytes
        interface ExportableAsset {
          bytes: Uint8Array;
          name: string;
          setting: { format: string; suffix?: string };
        }
        
        // Collect exportable assets from selected nodes
        const exportableBytes: ExportableAsset[] = [];
        
        // Function to recursively process a node and its children
        async function processNode(node: SceneNode, prefix = '') {
          console.log(`Node: ${node.name} has export settings:`, node.exportSettings, node.type);
          
          // Skip invisible nodes (like in generateReactComponent)
          if ('visible' in node && !node.visible) {
            return;
          }
          
          // Skip nodes with zero opacity
          if ('opacity' in node && node.opacity === 0) {
            return;
          }
          
          // Skip nodes without render bounds
          if ('absoluteRenderBounds' in node && !node.absoluteRenderBounds) {
            return;
          }
          
          // Generate asset name in the same way as the component generator
          // This matches how assets are referenced in the generated React components
          const assetName = node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          let assetPath = assetName;
          
          // If there's a prefix, create a folder structure
          if (prefix) {
            // Convert prefix to kebab-case folder structure (similar to how assets are referenced)
            const folderPath = prefix.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-\/]/g, '');
            assetPath = `${folderPath}/${assetName}`;
          }
          
          // Check if node has image fills and extract them - these are real assets
          if ('fills' in node) {
            const imageFills = (node.fills as readonly Paint[])
              .filter(fill => fill.type === 'IMAGE' && fill.visible !== false);
            
            // If node has image fills, export them directly
            if (imageFills.length > 0) {
              for (let i = 0; i < imageFills.length; i++) {
                const imageFill = imageFills[i] as ImagePaint;
                
                try {
                  // Get the image hash
                  const imageHash = imageFill.imageHash;
                  if (imageHash) {
                    // Get the image from Figma
                    const image = figma.getImageByHash(imageHash);
                    if (image) {
                      // Export as PNG
                      const bytes = await image.getBytesAsync();
                      
                      // Use consistent naming with how images are referenced in components
                      const imageName = imageFills.length > 1 
                        ? `${assetName}-image-${i + 1}` 
                        : assetName;
                      
                      // Place in assets folder as referenced in components
                      exportableBytes.push({
                        bytes,
                        name: `assets/${imageName}`,
                        setting: { format: 'PNG' }
                      });
                    }
                  }
                } catch (err) {
                  console.error(`Failed to export image fill from ${node.name}:`, err);
                }
              }
            }
          }
          
          // Only export SVGs for actual vector assets (icons, graphics, illustrations)
          const isAsset = 
            // Check if node name suggests it's an asset
            node.name.toLowerCase().includes('icon') || 
            node.name.toLowerCase().includes('image') ||
            node.name.toLowerCase().includes('illustration') || 
            node.name.toLowerCase().includes('graphic') ||
            node.name.toLowerCase().includes('logo') ||
            // Check if it has export settings (user explicitly marked for export)
            (node.exportSettings && node.exportSettings.length > 0) ||
            // For vector-type nodes, check if they're small and likely icons
            ((node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') && 
             'width' in node && 'height' in node && 
             (node.width <= 64 || node.height <= 64));
          
          // For vectors and other suitable nodes that are actual assets, export as SVG
          if (isAsset && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || 
              node.type === 'STAR' || node.type === 'ELLIPSE' || 
              node.type === 'POLYGON' || node.type === 'RECTANGLE' || 
              node.type === 'LINE')) {
            try {
              const svgBytes = await node.exportAsync({
                format: 'SVG',
                svgOutlineText: true,
                svgIdAttribute: true,
                svgSimplifyStroke: true
              });
              
              // Place in the assets/svg folder as referenced in svgComponent.ts
              exportableBytes.push({
                bytes: svgBytes,
                name: `assets/svg/${assetName}`,
                setting: { format: 'SVG' }
              });
              
              // Don't export PNG version - we only need the SVG
            } catch (err) {
              console.error(`Failed to export SVG from ${node.name}:`, err);
            }
          }
          
          // Skip exporting regular UI elements that aren't assets
          // We've already handled images and vectors above
          
          // Recursively process children if this is a parent node
          if ('children' in node) {
            // Skip processing children of instances - they're references to components
            // that are already handled elsewhere
            if (node.type === 'INSTANCE') {
              return;
            }
            
            // Only update the prefix for nodes that would become components
            // This matches the component hierarchy in generateReactComponent
            const shouldUpdatePrefix = 
              node.type === 'FRAME' || 
              node.type === 'GROUP' || 
              node.type === 'COMPONENT';
            
            const nextPrefix = shouldUpdatePrefix ? 
              (prefix ? `${prefix}/${node.name}` : node.name) : 
              prefix;
            
            for (const child of node.children) {
              await processNode(child, nextPrefix);
            }
          }
        }
        
        // Process each selected node and its children
        for (const node of selection) {
          await processNode(node);
        }
        
        // If we have assets to export, send them to the UI
        if (exportableBytes.length > 0) {
          figma.notify(`Exporting ${exportableBytes.length} assets...`);
          figma.ui.postMessage({
            type: 'EXPORT_ASSETS',
            exportableBytes
          });
        } else {
          figma.notify('No exportable assets found. Make sure you have visible elements selected.');
        }
      } catch (error) {
        console.error('Error exporting assets:', error);
        figma.notify(`Error exporting assets: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
});

// Debug function to reset counters for testing
async function resetUsageForTesting() {
  console.log('RESETTING USAGE FOR TESTING');
  await figma.clientStorage.setAsync(STORAGE_KEY_USAGE_COUNT, 0);
  await figma.clientStorage.setAsync(STORAGE_KEY_HAS_SUBSCRIPTION, false);
  console.log('Usage and subscription status reset');
}