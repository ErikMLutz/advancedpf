#!/usr/bin/env node

// Theme Classification Helper
// Generates suggested purpose mappings for a theme
// Output can be manually edited for perfect results

/**
 * Calculate relative luminance of a color (0-1)
 */
function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Classify a theme's palette into purpose-based mappings
 * @param {Object} palette - Theme palette with color families
 * @returns {Object} - Suggested mappings
 */
function classifyTheme(palette) {
    // Collect all available colors with their paths
    const allColors = [];
    for (const [familyName, shades] of Object.entries(palette)) {
        for (const [shade, hex] of Object.entries(shades)) {
            if (shade === 'DEFAULT') continue;
            allColors.push({
                path: `${familyName}.${shade}`,
                hex,
                luminance: getLuminance(hex),
                family: familyName,
                shade: parseInt(shade)
            });
        }
    }

    // Sort by luminance
    allColors.sort((a, b) => a.luminance - b.luminance);

    // Pick background (darkest or lightest)
    const darkest = allColors[0];
    const lightest = allColors[allColors.length - 1];
    const isDark = darkest.luminance < 0.5;
    const background = isDark ? darkest : lightest;

    // Find background alt (slightly different from background)
    let backgroundAlt = null;
    let backgroundAltContrast = 0;
    for (const color of allColors) {
        if (color.path === background.path) continue;
        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast > 1.1 && contrast < 2 && contrast > backgroundAltContrast) {
            backgroundAlt = color;
            backgroundAltContrast = contrast;
        }
    }
    if (!backgroundAlt) backgroundAlt = allColors[1];

    // Find text (highest contrast with background)
    let text = null;
    let textContrast = 0;
    for (const color of allColors) {
        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast > textContrast) {
            text = color;
            textContrast = contrast;
        }
    }

    // Find text subtle (medium contrast)
    let textSubtle = null;
    let textSubtleContrast = 0;
    for (const color of allColors) {
        if (color.path === text.path) continue;
        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast >= 3 && contrast < textContrast) {
            if (!textSubtle || Math.abs(contrast - 4.5) < Math.abs(textSubtleContrast - 4.5)) {
                textSubtle = color;
                textSubtleContrast = contrast;
            }
        }
    }
    if (!textSubtle) textSubtle = text;

    // Find accent (good contrast, distinct from text)
    let accent = null;
    let accentContrast = 0;
    for (const color of allColors) {
        if (color.path === text.path || color.family === text.family) continue;
        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast >= 3 && contrast > accentContrast) {
            accent = color;
            accentContrast = contrast;
        }
    }
    if (!accent) accent = text;

    // Find accent alt (different from accent)
    let accentAlt = null;
    let accentAltContrast = 0;
    for (const color of allColors) {
        if (color.path === accent.path || color.family === accent.family) continue;
        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast >= 3 && contrast > accentAltContrast) {
            accentAlt = color;
            accentAltContrast = contrast;
        }
    }
    if (!accentAlt) accentAlt = accent;

    // Find textDark (good contrast on light backgrounds, darker than textSubtle)
    let textDark = null;
    for (const color of allColors) {
        if (color.luminance < 0.3) {  // Dark color
            textDark = color;
            break;
        }
    }
    if (!textDark) textDark = darkest;

    // Find textDarkSubtle (slightly lighter than textDark)
    let textDarkSubtle = null;
    for (const color of allColors) {
        if (color.luminance > textDark.luminance && color.luminance < 0.4) {
            textDarkSubtle = color;
            break;
        }
    }
    if (!textDarkSubtle) textDarkSubtle = textDark;

    // Find chart colors (diverse, good contrast)
    const chartColors = [];
    const usedFamilies = new Set();

    for (const color of allColors) {
        if (chartColors.length >= 5) break;
        if (usedFamilies.has(color.family)) continue;

        const contrast = getContrastRatio(background.hex, color.hex);
        if (contrast >= 3) {
            chartColors.push(color);
            usedFamilies.add(color.family);
        }
    }

    // Fill remaining chart colors if needed
    while (chartColors.length < 5) {
        chartColors.push(accent);
    }

    return {
        background: background.path,
        backgroundAlt: backgroundAlt.path,
        text: text.path,
        textSubtle: textSubtle.path,
        textDark: textDark.path,
        textDarkSubtle: textDarkSubtle.path,
        accent: accent.path,
        accentAlt: accentAlt.path,
        chart1: chartColors[0].path,
        chart2: chartColors[1].path,
        chart3: chartColors[2].path,
        chart4: chartColors[3].path,
        chart5: chartColors[4].path
    };
}

/**
 * Main function - example usage
 */
function main() {
    // Example palette (Ocean Sunset)
    const examplePalette = {
        ink_black: {
            DEFAULT: '#001219',
            100: '#000405',
            500: '#001219',
            900: '#9ee4ff'
        },
        golden_orange: {
            DEFAULT: '#ee9b00',
            100: '#301f00',
            500: '#ee9b00',
            900: '#ffecc9'
        },
        vanilla_custard: {
            DEFAULT: '#e9d8a6',
            100: '#403410',
            500: '#e9d8a6',
            900: '#fbf7ed'
        }
    };

    console.log('Theme Classification Helper');
    console.log('============================\n');
    console.log('Example classification:\n');

    const mapping = classifyTheme(examplePalette);

    console.log('mapping: {');
    for (const [purpose, path] of Object.entries(mapping)) {
        console.log(`  ${purpose}: '${path}',`);
    }
    console.log('}');

    console.log('\nTo use:');
    console.log('1. Define your theme palette in themes.js');
    console.log('2. Run this script with your palette');
    console.log('3. Copy the suggested mapping');
    console.log('4. Manually tune for perfect results');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { classifyTheme };
