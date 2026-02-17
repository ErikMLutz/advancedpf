// Theme System
// Themes are loaded from individual JSON files in web/themes/
// Call initThemes() before using any theme functions.

const THEME_KEYS = [
    'oceanSunset',
    'pacificMist_dark',
    'pacificMist_light',
    'blackWhite_dark',
    'blackWhite_light'
];

let THEMES = {};

// Pre-load the default theme synchronously so getTheme() works before initThemes() resolves.
// Synchronous XHR is acceptable here — this is a local-only tool served over localhost.
(function () {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'themes/pacificMist_dark.json', false);
        xhr.send();
        THEMES.pacificMist_dark = xhr.status === 200
            ? JSON.parse(xhr.responseText)
            : { name: 'Pacific Mist Dark', palette: {}, mapping: {} };
    } catch (e) {
        THEMES.pacificMist_dark = { name: 'Pacific Mist Dark', palette: {}, mapping: {} };
    }
}());

/**
 * Load all theme JSON files in parallel and populate THEMES.
 * Must be awaited before calling getTheme() or getAllThemes().
 */
async function initThemes() {
    const entries = await Promise.all(
        THEME_KEYS.map(async key => {
            const res = await fetch(`themes/${key}.json`);
            if (!res.ok) throw new Error(`Failed to load theme: ${key}`);
            const data = await res.json();
            return [key, data];
        })
    );
    THEMES = Object.fromEntries(entries);
}

/**
 * Generate 100–900 shades from a single hex color (treated as the 500 shade).
 * 100 = darkest, 900 = lightest. Hue and saturation are held constant.
 * @param {string} hex - Hex color string (e.g. '#1985a1')
 * @returns {Object} - Object with keys DEFAULT, 100–900
 */
function generateColorShades(hex) {
    const [h, s, l] = hexToHsl(hex);

    const l100 = Math.max(2, l * 0.2);
    const l900 = Math.min(97, l + (100 - l) * 0.85);

    const shades = { DEFAULT: hex };
    [100, 200, 300, 400, 500, 600, 700, 800, 900].forEach(shade => {
        let lightness;
        if (shade <= 500) {
            const t = (shade - 100) / 400;
            lightness = l100 + (l - l100) * t;
        } else {
            const t = (shade - 500) / 400;
            lightness = l + (l900 - l) * t;
        }
        shades[String(shade)] = hslToHex(h, s, lightness);
    });
    return shades;
}

// --- Color conversion helpers ---

function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / delta + 2) / 6;
        else h = ((r - g) / delta + 4) / 6;
    }

    return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

// --- Theme API ---

/**
 * Get a color value from a theme's palette
 * @param {Object} theme - Theme object
 * @param {string} path - Color path like 'ink_black.100' or 'white.500'
 * @returns {string} - Hex color
 */
function getColor(theme, path) {
    const [colorFamily, shade] = path.split('.');
    return theme.palette[colorFamily]?.[shade] || '#ff00ff'; // Magenta for missing colors
}

/**
 * Get theme with resolved color values
 * @param {string} themeName - Name of theme
 * @returns {Object} - Theme with colors, name, and classified colors
 */
function getTheme(themeName) {
    const theme = THEMES[themeName] || THEMES[THEME_KEYS[0]];

    // Resolve mapped colors
    const classified = {};
    for (const [purpose, path] of Object.entries(theme.mapping)) {
        classified[purpose] = getColor(theme, path);
    }

    // Get all palette colors for the color picker
    const paletteColors = [];
    for (const colorFamily of Object.values(theme.palette)) {
        if (!paletteColors.includes(colorFamily.DEFAULT)) {
            paletteColors.push(colorFamily.DEFAULT);
        }
    }

    return {
        name: theme.name,
        colors: paletteColors,
        classified
    };
}

/**
 * Get all available themes (for theme selector)
 * @returns {Object} - All themes with basic info
 */
function getAllThemes() {
    const themes = {};
    for (const [key, theme] of Object.entries(THEMES)) {
        // Get unique DEFAULT colors for preview
        const colors = [];
        for (const colorFamily of Object.values(theme.palette)) {
            if (!colors.includes(colorFamily.DEFAULT)) {
                colors.push(colorFamily.DEFAULT);
            }
        }
        themes[key] = {
            name: theme.name,
            colors
        };
    }
    return themes;
}
