// Finance Dashboard - Color Management
// Helper functions for accessing colorschemes

/**
 * Get the current color palette
 * @param {string} schemeName - Name of the colorscheme
 * @returns {Array<string>} Array of color hex codes
 */
function getColorPalette(schemeName) {
    const scheme = CONFIG.colorschemes[schemeName] || CONFIG.colorschemes[CONFIG.defaultColorscheme];
    return scheme.colors;
}

/**
 * Get a specific color from the current palette
 * @param {string} schemeName - Name of the colorscheme
 * @param {number} index - Index of the color
 * @returns {string} Hex color code
 */
function getColor(schemeName, index) {
    const palette = getColorPalette(schemeName);
    return palette[index % palette.length];
}

/**
 * Get multiple colors from the palette
 * @param {string} schemeName - Name of the colorscheme
 * @param {number} count - Number of colors needed
 * @returns {Array<string>} Array of hex color codes
 */
function getColors(schemeName, count) {
    const palette = getColorPalette(schemeName);
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}
