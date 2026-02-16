// Color Schemes Library
// Each scheme can have 2-10 colors. If fewer than 10, they'll be intelligently repeated.

const COLOR_SCHEMES = {
    pacificMist_light: {
        name: 'Pacific Mist Light',
        colors: [
            '#dcdcdd', // alabaster_grey
            '#c5c3c6', // pale_slate
            '#46494c', // iron_grey
            '#4c5c68', // blue_slate
            '#1985a1'  // pacific_cyan
        ]
    },
    pacificMist_dark: {
        name: 'Pacific Mist Dark',
        colors: [
            '#46494c', // iron_grey (darker background)
            '#4c5c68', // blue_slate
            '#1985a1', // pacific_cyan
            '#c5c3c6', // pale_slate
            '#dcdcdd'  // alabaster_grey (lighter accent)
        ]
    },
    blackWhite_light: {
        name: 'Black & White Light',
        colors: [
            '#ffffff', // white
            '#000000'  // black
        ]
    },
    blackWhite_dark: {
        name: 'Black & White Dark',
        colors: [
            '#000000', // black
            '#ffffff'  // white
        ]
    }
    // Add more schemes here as needed
};

/**
 * Normalize a color scheme to always return 10 colors
 * @param {Array} colors - Array of 2-10 hex colors
 * @returns {Array} - Array of exactly 10 hex colors
 */
function normalizeColorScheme(colors) {
    if (colors.length >= 10) {
        return colors.slice(0, 10);
    }

    const normalized = [];
    let index = 0;

    // Intelligently repeat colors to reach 10
    while (normalized.length < 10) {
        normalized.push(colors[index % colors.length]);
        index++;
    }

    return normalized;
}

/**
 * Get a color scheme by name
 * @param {string} schemeName - Name of the scheme
 * @returns {Object} - Scheme object with name and 10 colors
 */
function getColorScheme(schemeName = 'pacificMist_dark') {
    const scheme = COLOR_SCHEMES[schemeName] || COLOR_SCHEMES.pacificMist_dark;
    return {
        name: scheme.name,
        colors: normalizeColorScheme(scheme.colors)
    };
}

/**
 * Get all available color schemes
 * @returns {Object} - All color schemes with their raw colors
 */
function getAllColorSchemes() {
    return COLOR_SCHEMES;
}

/**
 * Get background color from current scheme (uses first color)
 * @param {string} schemeName - Name of the scheme
 * @returns {string} - Hex color
 */
function getBackgroundColor(schemeName = 'pacificMist_dark') {
    return getColorScheme(schemeName).colors[0];
}

/**
 * Get text color that contrasts with background
 * @param {string} backgroundColor - Hex color
 * @returns {string} - 'white' or 'black'
 */
function getContrastTextColor(backgroundColor) {
    // Remove # if present
    const hex = backgroundColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#ffffff';
}
