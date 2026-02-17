// Theme System
// Each theme defines color families with 100-900 variations
// Then maps purpose-based variables to specific colors

const THEMES = {
    oceanSunset: {
        name: 'Ocean Sunset',
        palette: {
            ink_black: {
                DEFAULT: '#001219',
                100: '#000405',
                200: '#00070a',
                300: '#000b0f',
                400: '#000f14',
                500: '#001219',
                600: '#00587a',
                700: '#009ddb',
                800: '#3dc8ff',
                900: '#9ee4ff'
            },
            dark_teal: {
                DEFAULT: '#005f73',
                100: '#001417',
                200: '#00272f',
                300: '#003b46',
                400: '#004e5e',
                500: '#005f73',
                600: '#00a3c4',
                700: '#13d8ff',
                800: '#62e5ff',
                900: '#b0f2ff'
            },
            dark_cyan: {
                DEFAULT: '#0a9396',
                100: '#021d1e',
                200: '#043b3b',
                300: '#065859',
                400: '#087577',
                500: '#0a9396',
                600: '#0ed3d7',
                700: '#39eff2',
                800: '#7bf4f7',
                900: '#bdfafb'
            },
            pearl_aqua: {
                DEFAULT: '#94d2bd',
                100: '#153229',
                200: '#2a6551',
                300: '#3f977a',
                400: '#61bd9e',
                500: '#94d2bd',
                600: '#a9dbca',
                700: '#bee4d7',
                800: '#d4ede5',
                900: '#e9f6f2'
            },
            vanilla_custard: {
                DEFAULT: '#e9d8a6',
                100: '#403410',
                200: '#7f6720',
                300: '#bf9b30',
                400: '#d9bc66',
                500: '#e9d8a6',
                600: '#ede0b7',
                700: '#f2e7c9',
                800: '#f6efdb',
                900: '#fbf7ed'
            },
            golden_orange: {
                DEFAULT: '#ee9b00',
                100: '#301f00',
                200: '#603e00',
                300: '#905d00',
                400: '#c07d00',
                500: '#ee9b00',
                600: '#ffb327',
                700: '#ffc65d',
                800: '#ffd993',
                900: '#ffecc9'
            },
            burnt_caramel: {
                DEFAULT: '#ca6702',
                100: '#281400',
                200: '#512901',
                300: '#793d01',
                400: '#a25202',
                500: '#ca6702',
                600: '#fd850d',
                700: '#fda349',
                800: '#fec286',
                900: '#fee0c2'
            },
            rusty_spice: {
                DEFAULT: '#bb3e03',
                100: '#250c01',
                200: '#4a1801',
                300: '#702402',
                400: '#953102',
                500: '#bb3e03',
                600: '#f95104',
                700: '#fc7c41',
                800: '#fda880',
                900: '#fed3c0'
            },
            oxidized_iron: {
                DEFAULT: '#ae2012',
                100: '#230604',
                200: '#460d07',
                300: '#69130b',
                400: '#8c190f',
                500: '#ae2012',
                600: '#e72b1a',
                700: '#ed6053',
                800: '#f3958d',
                900: '#f9cac6'
            },
            brown_red: {
                DEFAULT: '#9b2226',
                100: '#1f0708',
                200: '#3e0e0f',
                300: '#5d1417',
                400: '#7c1b1e',
                500: '#9b2226',
                600: '#cf2e33',
                700: '#dc6165',
                800: '#e89698',
                900: '#f3cacc'
            }
        },
        // Purpose-based mappings (manually tuned for this theme)
        mapping: {
            background: 'ink_black.100',
            backgroundAlt: 'dark_teal.300',
            text: 'vanilla_custard.900',
            textSubtle: 'pearl_aqua.700',
            textDark: 'ink_black.400',
            textDarkSubtle: 'dark_teal.500',
            accent: 'golden_orange.600',
            accentAlt: 'rusty_spice.600',
            chart1: 'dark_cyan.600',
            chart2: 'pearl_aqua.500',
            chart3: 'golden_orange.500',
            chart4: 'burnt_caramel.600',
            chart5: 'rusty_spice.500',
            chartWarn: 'golden_orange.400',
            chartAlarm: 'oxidized_iron.600'
        }
    },

    pacificMist_dark: {
        name: 'Pacific Mist Dark',
        palette: {
            iron_grey: {
                DEFAULT: '#46494c',
                100: '#0e0f10',
                200: '#1d1e1f',
                300: '#2b2d2f',
                400: '#393c3e',
                500: '#46494c',
                600: '#6b6f73',
                700: '#91959a',
                800: '#b8bbc0',
                900: '#dcdde0'
            },
            blue_slate: {
                DEFAULT: '#4c5c68',
                100: '#0f1215',
                200: '#1e252a',
                300: '#2e373f',
                400: '#3d4a54',
                500: '#4c5c68',
                600: '#6a7e8f',
                700: '#93a3b0',
                800: '#bcc8d1',
                900: '#dee4e8'
            },
            pacific_cyan: {
                DEFAULT: '#1985a1',
                100: '#051b20',
                200: '#0a3541',
                300: '#0f5061',
                400: '#146a82',
                500: '#1985a1',
                600: '#22b3d9',
                700: '#54c9e8',
                800: '#8ddcf0',
                900: '#c6eef8'
            },
            pale_slate: {
                DEFAULT: '#c5c3c6',
                100: '#282728',
                200: '#504e50',
                300: '#787578',
                400: '#9f9ca1',
                500: '#c5c3c6',
                600: '#d1cfd2',
                700: '#dcdade',
                800: '#e8e7e9',
                900: '#f3f3f4'
            },
            alabaster_grey: {
                DEFAULT: '#dcdcdd',
                100: '#333233',
                200: '#666466',
                300: '#999699',
                400: '#bbbbbd',
                500: '#dcdcdd',
                600: '#e3e3e4',
                700: '#eaeaea',
                800: '#f1f1f1',
                900: '#f8f8f8'
            }
        },
        mapping: {
            background: 'iron_grey.500',
            backgroundAlt: 'blue_slate.500',
            text: 'alabaster_grey.900',
            textSubtle: 'pale_slate.600',
            textDark: 'iron_grey.200',
            textDarkSubtle: 'blue_slate.300',
            accent: 'pacific_cyan.600',
            accentAlt: 'pacific_cyan.700',
            chart1: 'pacific_cyan.900',
            chart2: 'pacific_cyan.600',
            chart3: 'blue_slate.700',
            chart4: 'alabaster_grey.300',
            chart5: 'pacific_cyan.300',
            chartWarn: 'iron_grey.900',
            chartAlarm: 'pale_slate.300'
        }
    },

    pacificMist_light: {
        name: 'Pacific Mist Light',
        palette: {
            iron_grey: {
                DEFAULT: '#46494c',
                100: '#0e0f10',
                200: '#1d1e1f',
                300: '#2b2d2f',
                400: '#393c3e',
                500: '#46494c',
                600: '#6b6f73',
                700: '#91959a',
                800: '#b8bbc0',
                900: '#dcdde0'
            },
            blue_slate: {
                DEFAULT: '#4c5c68',
                100: '#0f1215',
                200: '#1e252a',
                300: '#2e373f',
                400: '#3d4a54',
                500: '#4c5c68',
                600: '#6a7e8f',
                700: '#93a3b0',
                800: '#bcc8d1',
                900: '#dee4e8'
            },
            pacific_cyan: {
                DEFAULT: '#1985a1',
                100: '#051b20',
                200: '#0a3541',
                300: '#0f5061',
                400: '#146a82',
                500: '#1985a1',
                600: '#22b3d9',
                700: '#54c9e8',
                800: '#8ddcf0',
                900: '#c6eef8'
            },
            pale_slate: {
                DEFAULT: '#c5c3c6',
                100: '#282728',
                200: '#504e50',
                300: '#787578',
                400: '#9f9ca1',
                500: '#c5c3c6',
                600: '#d1cfd2',
                700: '#dcdade',
                800: '#e8e7e9',
                900: '#f3f3f4'
            },
            alabaster_grey: {
                DEFAULT: '#dcdcdd',
                100: '#333233',
                200: '#666466',
                300: '#999699',
                400: '#bbbbbd',
                500: '#dcdcdd',
                600: '#e3e3e4',
                700: '#eaeaea',
                800: '#f1f1f1',
                900: '#f8f8f8'
            }
        },
        mapping: {
            background: 'alabaster_grey.900',
            backgroundAlt: 'pale_slate.700',
            text: 'iron_grey.200',
            textSubtle: 'blue_slate.400',
            textDark: 'iron_grey.200',
            textDarkSubtle: 'blue_slate.300',
            accent: 'pacific_cyan.600',
            accentAlt: 'pacific_cyan.500',
            chart1: 'pacific_cyan.600',
            chart2: 'blue_slate.500',
            chart3: 'iron_grey.500',
            chart4: 'pale_slate.400',
            chart5: 'pacific_cyan.500',
            chartWarn: 'iron_grey.600',
            chartAlarm: 'pale_slate.200'
        }
    },

    blackWhite_dark: {
        name: 'Black & White Dark',
        palette: {
            black: {
                DEFAULT: '#000000',
                100: '#000000',
                200: '#000000',
                300: '#000000',
                400: '#000000',
                500: '#000000',
                600: '#000000',
                700: '#000000',
                800: '#000000',
                900: '#000000'
            },
            white: {
                DEFAULT: '#ffffff',
                100: '#ffffff',
                200: '#ffffff',
                300: '#ffffff',
                400: '#ffffff',
                500: '#ffffff',
                600: '#ffffff',
                700: '#ffffff',
                800: '#ffffff',
                900: '#ffffff'
            },
            grey: {
                DEFAULT: '#808080',
                100: '#1a1a1a',
                200: '#333333',
                300: '#4d4d4d',
                400: '#666666',
                500: '#808080',
                600: '#999999',
                700: '#b3b3b3',
                800: '#cccccc',
                900: '#e6e6e6'
            }
        },
        mapping: {
            background: 'black.500',
            backgroundAlt: 'grey.200',
            text: 'white.500',
            textSubtle: 'grey.700',
            textDark: 'black.500',
            textDarkSubtle: 'grey.300',
            accent: 'white.500',
            accentAlt: 'grey.600',
            chart1: 'white.500',
            chart2: 'grey.700',
            chart3: 'grey.500',
            chart4: 'grey.400',
            chart5: 'grey.300',
            chartWarn: 'grey.600',
            chartAlarm: 'grey.800'
        }
    },

    blackWhite_light: {
        name: 'Black & White Light',
        palette: {
            black: {
                DEFAULT: '#000000',
                100: '#000000',
                200: '#000000',
                300: '#000000',
                400: '#000000',
                500: '#000000',
                600: '#000000',
                700: '#000000',
                800: '#000000',
                900: '#000000'
            },
            white: {
                DEFAULT: '#ffffff',
                100: '#ffffff',
                200: '#ffffff',
                300: '#ffffff',
                400: '#ffffff',
                500: '#ffffff',
                600: '#ffffff',
                700: '#ffffff',
                800: '#ffffff',
                900: '#ffffff'
            },
            grey: {
                DEFAULT: '#808080',
                100: '#1a1a1a',
                200: '#333333',
                300: '#4d4d4d',
                400: '#666666',
                500: '#808080',
                600: '#999999',
                700: '#b3b3b3',
                800: '#cccccc',
                900: '#e6e6e6'
            }
        },
        mapping: {
            background: 'white.500',
            backgroundAlt: 'grey.800',
            text: 'black.500',
            textSubtle: 'grey.300',
            textDark: 'black.500',
            textDarkSubtle: 'grey.300',
            accent: 'black.500',
            accentAlt: 'grey.400',
            chart1: 'black.500',
            chart2: 'grey.300',
            chart3: 'grey.500',
            chart4: 'grey.600',
            chart5: 'grey.700',
            chartWarn: 'grey.400',
            chartAlarm: 'grey.200'
        }
    }
};

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
    const theme = THEMES[themeName] || THEMES.pacificMist_dark;

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
