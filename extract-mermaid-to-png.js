const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration for high-resolution output
const CONFIG = {
    width: 3840,        // 4K width
    height: 2160,       // 4K height
    scale: 2,           // 2x scaling for retina
    backgroundColor: 'white',
    theme: 'default'
};

function extractMermaidBlocks(markdownContent) {
    // Regex to match mermaid code blocks
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
    const blocks = [];
    let match;
    let index = 0;
    
    while ((match = mermaidRegex.exec(markdownContent)) !== null) {
        blocks.push({
            content: match[1].trim(),
            index: index++,
            startLine: markdownContent.substring(0, match.index).split('\n').length
        });
    }
    
    return blocks;
}

async function convertMermaidToPNG(mermaidContent, outputPath) {
    const tempFile = `temp_mermaid_${Date.now()}.mmd`;
    
    try {
        // Write mermaid content to temporary file
        fs.writeFileSync(tempFile, mermaidContent);
        
        // Build mmdc command with high-resolution settings
        const command = [
            'mmdc',
            `-i "${tempFile}"`,
            `-o "${outputPath}"`,
            `--width ${CONFIG.width}`,
            `--height ${CONFIG.height}`,
            `--scale ${CONFIG.scale}`,
            `--backgroundColor ${CONFIG.backgroundColor}`,
            `--theme ${CONFIG.theme}`
        ].join(' ');
        
        console.log(`Converting: ${outputPath}`);
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('Warning')) {
            console.error(`Warning for ${outputPath}:`, stderr);
        }
        
        console.log(`✅ Successfully created: ${outputPath}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error converting ${outputPath}:`, error.message);
        return false;
    } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

async function processMarkdownFile(filePath, outputDir = './mermaid-exports') {
    try {
        // Read markdown file
        const markdownContent = fs.readFileSync(filePath, 'utf8');
        const baseName = path.basename(filePath, path.extname(filePath));
        
        // Create output directory
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Extract all mermaid blocks
        const mermaidBlocks = extractMermaidBlocks(markdownContent);
        
        if (mermaidBlocks.length === 0) {
            console.log('No Mermaid charts found in the document.');
            return;
        }
        
        console.log(`Found ${mermaidBlocks.length} Mermaid chart(s) in ${filePath}`);
        
        // Convert each block to PNG
        const results = [];
        for (const block of mermaidBlocks) {
            const outputFileName = `${baseName}_diagram_${block.index + 1}.png`;
            const outputPath = path.join(outputDir, outputFileName);
            
            const success = await convertMermaidToPNG(block.content, outputPath);
            results.push({
                index: block.index + 1,
                success,
                outputPath,
                startLine: block.startLine
            });
        }
        
        // Summary
        const successful = results.filter(r => r.success).length;
        console.log(`\n📊 Conversion Summary:`);
        console.log(`✅ Successful: ${successful}/${results.length}`);
        console.log(`📁 Output directory: ${outputDir}`);
        
        // List all created files
        console.log(`\n📋 Created files:`);
        results.forEach(result => {
            if (result.success) {
                console.log(`  • ${path.basename(result.outputPath)} (from line ~${result.startLine})`);
            }
        });
        
    } catch (error) {
        console.error('Error processing markdown file:', error.message);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node extract-mermaid-to-png.js <markdown-file> [output-directory]');
        console.log('Example: node extract-mermaid-to-png.js ./README.md ./diagrams');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputDir = args[1] || './mermaid-exports';
    
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: File ${inputFile} not found.`);
        process.exit(1);
    }
    
    console.log(`🚀 Processing: ${inputFile}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🎯 Resolution: ${CONFIG.width}x${CONFIG.height} (${CONFIG.scale}x scale)\n`);
    
    await processMarkdownFile(inputFile, outputDir);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { processMarkdownFile, extractMermaidBlocks };
