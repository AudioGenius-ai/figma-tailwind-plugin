import prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserHTML from "prettier/plugins/html";
import parserCSS from "prettier/plugins/postcss";
import parserES from "prettier/plugins/estree";
import JSZip from "jszip";
const PRINT_WIDTH = 80;

async function formatCode({ language, code, printWidth = PRINT_WIDTH }: { language: 'HTML' | 'CSS' | 'JSON' | 'JAVASCRIPT' | 'TYPESCRIPT', code: string, printWidth?: number }) {
  switch (language) {
    case "HTML":
      return await prettier.format(code, {
        printWidth,
        parser: "html",
        plugins: [parserHTML],
        htmlWhitespaceSensitivity: "ignore",
        bracketSameLine: false,
      });
    case "CSS":
      return await prettier.format(code, {
        printWidth,
        parser: "css",
        plugins: [parserCSS],
      });
    case "JSON":
      return JSON.stringify(JSON.parse(code), null, 2);
    case "JAVASCRIPT":
    case "TYPESCRIPT":
      return await prettier.format(code, {
        printWidth,
        parser: "babel-ts",
        plugins: [parserBabel, parserES],
        semi: true,
      });
  }
}

window.onmessage = async (event) => {
  if (!event.data.pluginMessage) return

  const pluginMessage = event.data.pluginMessage;

  if (pluginMessage.type === "FORMAT") {
    formatCode(pluginMessage).then((result) => {
      parent.postMessage(
        {
          pluginMessage: {
            id: pluginMessage.id,
            result,
            type: "FORMAT_RESULT",
          },
        },
        "*"
      );
    });
  } else if (pluginMessage.type === "DOWNLOAD_COMPLETE") {
    // This will be handled by the React component
    console.log("Assets download completed");
  } else if (pluginMessage.type === "EXPORT_ASSETS") {
    const { exportableBytes } = pluginMessage;
    
    if (!exportableBytes || exportableBytes.length === 0) {
      console.error("No exportable bytes received");
      return;
    }

    try {
      let zip = new JSZip();
      
      for (let data of exportableBytes) {
        const { bytes, name, setting } = data;
        const cleanBytes = typedArrayToBuffer(bytes);
        const type = exportTypeToBlobType(setting.format);
        const extension = exportTypeToFileExtension(setting.format);
        let blob = new Blob([cleanBytes], { type });
        zip.file(`${name}${setting.suffix || ''}${extension}`, blob, {binary: true});
      }

      zip.generateAsync({ type: 'blob' })
        .then((content) => {
          const blobURL = window.URL.createObjectURL(content);
          const link = document.createElement('a');
          link.className = 'button button--primary';
          link.href = blobURL;
          link.download = "figma-assets.zip";
          link.click();
          
          // Notify the plugin that download is complete
          parent.postMessage(
            { pluginMessage: { type: "DOWNLOAD_COMPLETE" } },
            "*"
          );
        });
    } catch (error) {
      console.error("Error processing export assets:", error);
    }
  }
};

function typedArrayToBuffer(array: ArrayBufferView) {
  return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
}

function exportTypeToBlobType(type: string) {
  switch(type) {
    case "PDF": return 'application/pdf'
    case "SVG": return 'image/svg+xml'
    case "PNG": return 'image/png'
    case "JPG": return 'image/jpeg'
    default: return 'image/png'
  }
}

function exportTypeToFileExtension(type: string) {
  switch(type) {
    case "PDF": return '.pdf'
    case "SVG": return '.svg'
    case "PNG": return '.png'
    case "JPG": return '.jpg'
    default: return '.png'
  }
}