// This script generates app icons and splash screens for Tommy Expense
// Run with Node.js: node generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create directories if they don't exist
const iconDir = './images/icons';
const splashDir = './images/splash';

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
}

// App icon sizes
const iconSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 }
];

// Splash screen sizes
const splashSizes = [
    { name: 'apple-launch-640x1136.png', width: 640, height: 1136 },
    { name: 'apple-launch-750x1334.png', width: 750, height: 1334 },
    { name: 'apple-launch-1125x2436.png', width: 1125, height: 2436 },
    { name: 'apple-launch-1242x2208.png', width: 1242, height: 2208 },
    { name: 'apple-launch-1536x2048.png', width: 1536, height: 2048 },
    { name: 'apple-launch-1668x2224.png', width: 1668, height: 2224 },
    { name: 'apple-launch-1668x2388.png', width: 1668, height: 2388 },
    { name: 'apple-launch-2048x2732.png', width: 2048, height: 2732 }
];

// Generate app icons
function generateIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a1d2a');
    gradient.addColorStop(1, '#232839');
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw circle
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    // Outer glow
    ctx.shadowColor = '#4fc7ff';
    ctx.shadowBlur = size * 0.1;
    
    // Circle gradient
    const circleGradient = ctx.createLinearGradient(
        centerX - radius, 
        centerY - radius, 
        centerX + radius, 
        centerY + radius
    );
    circleGradient.addColorStop(0, '#4fc7ff');
    circleGradient.addColorStop(1, '#3a95c7');
    
    ctx.fillStyle = circleGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw "T" letter
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.4}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', centerX, centerY);
    
    // Save the image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`${iconDir}/${filename}`, buffer);
    console.log(`Generated: ${filename}`);
}

// Generate splash screens
function generateSplashScreen(width, height, filename) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1d2a');
    gradient.addColorStop(1, '#232839');
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw app icon
    const iconSize = Math.min(width, height) * 0.3;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = iconSize / 2;
    
    // Outer glow
    ctx.shadowColor = '#4fc7ff';
    ctx.shadowBlur = iconSize * 0.1;
    
    // Circle gradient
    const circleGradient = ctx.createLinearGradient(
        centerX - radius, 
        centerY - radius, 
        centerX + radius, 
        centerY + radius
    );
    circleGradient.addColorStop(0, '#4fc7ff');
    circleGradient.addColorStop(1, '#3a95c7');
    
    ctx.fillStyle = circleGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw "T" letter
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${iconSize * 0.5}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', centerX, centerY);
    
    // Draw app name
    ctx.font = `bold ${iconSize * 0.2}px Inter, sans-serif`;
    ctx.fillText('Tommy Expense', centerX, centerY + radius * 1.8);
    
    // Save the image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`${splashDir}/${filename}`, buffer);
    console.log(`Generated: ${filename}`);
}

// Generate Safari pinned tab SVG
function generateSafariPinnedTab() {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <path fill="#4fc7ff" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 11.2A.8.8 0 0 1 7.2 12V8.8H5.6a.8.8 0 0 1 0-1.6h4.8a.8.8 0 0 1 0 1.6H8.8V12a.8.8 0 0 1-.8.8z"/>
</svg>`;
    
    fs.writeFileSync(`${iconDir}/safari-pinned-tab.svg`, svgContent);
    console.log('Generated: safari-pinned-tab.svg');
}

// Generate all icons and splash screens
console.log('Generating app icons...');
iconSizes.forEach(icon => {
    generateIcon(icon.size, icon.name);
});

console.log('\nGenerating Safari pinned tab SVG...');
generateSafariPinnedTab();

console.log('\nGenerating splash screens...');
splashSizes.forEach(splash => {
    generateSplashScreen(splash.width, splash.height, splash.name);
});

console.log('\nAll assets generated successfully!'); 