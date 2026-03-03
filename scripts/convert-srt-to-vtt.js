#!/usr/bin/env node

/**
 * SRT to VTT Converter
 * Converts SRT subtitle files to WebVTT format for Video.js
 * 
 * Usage:
 *   node convert-srt-to-vtt.js <input.srt> [output.vtt]
 *   node convert-srt-to-vtt.js --all <directory>
 */

const fs = require('fs');
const path = require('path');

function convertSrtToVtt(srtContent) {
  // Start with WEBVTT header
  let vtt = 'WEBVTT\n\n';
  
  // Replace SRT timestamp format (00:00:00,000) with VTT format (00:00:00.000)
  const converted = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Add converted content
  vtt += converted;
  
  return vtt;
}

function convertFile(inputPath, outputPath) {
  try {
    // Read SRT file
    const srtContent = fs.readFileSync(inputPath, 'utf8');
    
    // Convert to VTT
    const vttContent = convertSrtToVtt(srtContent);
    
    // Write VTT file
    fs.writeFileSync(outputPath, vttContent, 'utf8');
    
    console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return false;
  }
}

function convertAllInDirectory(directory) {
  try {
    const files = fs.readdirSync(directory, { recursive: true });
    let converted = 0;
    let failed = 0;
    
    files.forEach(file => {
      const fullPath = path.join(directory, file);
      
      // Skip if not a file or not .srt
      if (!fs.statSync(fullPath).isFile() || !file.endsWith('.srt')) {
        return;
      }
      
      // Generate output path (replace .srt with .vtt)
      const outputPath = fullPath.replace(/\.srt$/i, '.vtt');
      
      // Skip if VTT already exists
      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  Skipped: ${file} (VTT already exists)`);
        return;
      }
      
      // Convert
      if (convertFile(fullPath, outputPath)) {
        converted++;
      } else {
        failed++;
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Converted: ${converted}`);
    console.log(`   ❌ Failed: ${failed}`);
    
  } catch (error) {
    console.error('❌ Error scanning directory:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('SRT to VTT Converter\n');
  console.log('Usage:');
  console.log('  Single file:  node convert-srt-to-vtt.js <input.srt> [output.vtt]');
  console.log('  All files:    node convert-srt-to-vtt.js --all <directory>');
  console.log('\nExamples:');
  console.log('  node convert-srt-to-vtt.js video.srt');
  console.log('  node convert-srt-to-vtt.js video.srt video.en_US.vtt');
  console.log('  node convert-srt-to-vtt.js --all "E:\\Learning Videos"');
  process.exit(0);
}

if (args[0] === '--all') {
  if (args.length < 2) {
    console.error('❌ Error: Please specify a directory');
    process.exit(1);
  }
  
  const directory = args[1];
  if (!fs.existsSync(directory)) {
    console.error(`❌ Error: Directory not found: ${directory}`);
    process.exit(1);
  }
  
  console.log(`🔄 Converting all SRT files in: ${directory}\n`);
  convertAllInDirectory(directory);
  
} else {
  // Single file conversion
  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(/\.srt$/i, '.vtt');
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: File not found: ${inputPath}`);
    process.exit(1);
  }
  
  if (!inputPath.toLowerCase().endsWith('.srt')) {
    console.error('❌ Error: Input file must be .srt');
    process.exit(1);
  }
  
  convertFile(inputPath, outputPath);
}
