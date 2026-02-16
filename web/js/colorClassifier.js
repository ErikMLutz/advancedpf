// Color Classification System for Ensuring Readable Themes

/**
 * Calculate relative luminance of a color (0-1)
 * @param {string} hex - Hex color
 * @returns {number} - Relative luminance
 */
function getLuminance(hex) {
    const rgb = hexToRgb(hex);

    // Convert to sRGB
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - Hex color
 * @param {string} color2 - Hex color
 * @returns {number} - Contrast ratio (1-21)
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
 * @param {string} hex - Hex color
 * @returns {Object} - {r, g, b}
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
 * Classify colors in a scheme into semantic buckets for readability
 * @param {Array} colors - Array of hex colors (normalized to 10)
 * @returns {Object} - Classified colors
 */
function classifyColors(colors) {
    const background = colors[0]; // First color is always background
    const backgroundLuminance = getLuminance(background);
    const isDarkBackground = backgroundLuminance < 0.5;

    // Find best text color (highest contrast with background)
    let bestTextColor = colors[1];
    let bestTextContrast = getContrastRatio(background, colors[1]);

    for (let i = 2; i < colors.length; i++) {
        const contrast = getContrastRatio(background, colors[i]);
        if (contrast > bestTextContrast) {
            bestTextContrast = contrast;
            bestTextColor = colors[i];
        }
    }

    // Find subtle text color (medium contrast, at least 3:1)
    let subtleTextColor = null;
    let subtleTextContrast = 0;

    for (let i = 1; i < colors.length; i++) {
        if (colors[i] === bestTextColor) continue;

        const contrast = getContrastRatio(background, colors[i]);
        // We want medium contrast (3-7 range ideally)
        if (contrast >= 3 && contrast < bestTextContrast) {
            if (subtleTextColor === null || Math.abs(contrast - 4.5) < Math.abs(subtleTextContrast - 4.5)) {
                subtleTextColor = colors[i];
                subtleTextContrast = contrast;
            }
        }
    }

    // If no subtle text found, use the best text color
    if (!subtleTextColor) {
        subtleTextColor = bestTextColor;
    }

    // Find accent color (should be different from background and text, good contrast)
    let accentColor = null;
    let accentContrast = 0;

    for (let i = 1; i < colors.length; i++) {
        if (colors[i] === bestTextColor) continue;

        const contrast = getContrastRatio(background, colors[i]);
        if (contrast >= 3 && contrast > accentContrast) {
            accentColor = colors[i];
            accentContrast = contrast;
        }
    }

    // Fallback to a color that's not the background or primary text
    if (!accentColor) {
        accentColor = colors.find(c => c !== background && c !== bestTextColor) || bestTextColor;
    }

    // Background alternative (for borders, grids) - low contrast with background
    let backgroundAlt = colors[1];
    let backgroundAltContrast = getContrastRatio(background, colors[1]);

    for (let i = 2; i < colors.length; i++) {
        const contrast = getContrastRatio(background, colors[i]);
        // We want low contrast (1-2 range)
        if (contrast < backgroundAltContrast && contrast > 1.1) {
            backgroundAlt = colors[i];
            backgroundAltContrast = contrast;
        }
    }

    // Accent alternative - find a color different from accent with good contrast
    let accentAltColor = null;
    let accentAltContrast = 0;

    for (let i = 1; i < colors.length; i++) {
        // Skip if it's the same as accent or background
        if (colors[i] === accentColor || colors[i] === background) continue;

        const contrast = getContrastRatio(background, colors[i]);
        // We want good contrast (at least 3:1) and prefer colors different from accent
        if (contrast >= 3 && contrast > accentAltContrast) {
            accentAltColor = colors[i];
            accentAltContrast = contrast;
        }
    }

    // Fallback: if no accentAlt found, use text color or a distinct color
    if (!accentAltColor) {
        accentAltColor = colors.find(c => c !== accentColor && c !== background) || bestTextColor;
    }

    return {
        background,           // Main background
        backgroundAlt,        // Borders, grids (subtle)
        text: bestTextColor,  // High contrast text (titles, labels)
        textSubtle: subtleTextColor,  // Medium contrast text
        accent: accentColor,  // Chart lines, data visualization
        accentAlt: accentAltColor, // Alternative accent

        // Metadata for debugging
        _luminance: backgroundLuminance,
        _isDark: isDarkBackground,
        _contrasts: {
            text: bestTextContrast,
            textSubtle: subtleTextContrast,
            accent: accentContrast,
            accentAlt: accentAltContrast,
            backgroundAlt: backgroundAltContrast
        }
    };
}

/**
 * Get classified color scheme
 * @param {string} schemeName - Name of the scheme
 * @returns {Object} - Classified colors
 */
function getClassifiedColorScheme(schemeName) {
    const scheme = getColorScheme(schemeName);
    const classified = classifyColors(scheme.colors);

    return {
        name: scheme.name,
        colors: scheme.colors,
        classified
    };
}
