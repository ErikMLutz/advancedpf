# AdvancedPF Web Dashboard

Clean, minimal personal finance dashboard built with Alpine.js and Tailwind CSS.

## Stack

- **Alpine.js** - Reactive UI
- **Tailwind CSS** - Styling
- **Pines** - Component library (modal, switch, etc.)
- **No build step** - All CDN-based

## Pines Components in Use

- **Modal** - Settings modal with teleport, transitions, and focus trapping
- **Dropdown** - Theme selector with color previews

## Design Principles

- Flat design (no shadows, no gradients)
- Clean typography
- Flexible color schemes (2-10 colors)
- Simple, local-first

## Running

```bash
just serve
```

Visit: http://localhost:8000/web/

## Current Themes

- **Pacific Mist Light** - Light grey-blue palette (5 colors)
- **Pacific Mist Dark** - Dark grey-blue palette (5 colors) - Default
- **Black & White Light** - Pure white background with black accents (2 colors)
- **Black & White Dark** - Pure black background with white accents (2 colors)

## Adding Color Schemes

Edit `web/js/colorSchemes.js` and add new schemes to the `COLOR_SCHEMES` object:

```javascript
const COLOR_SCHEMES = {
    myScheme_light: {
        name: 'My Scheme Light',
        colors: [
            '#color1',
            '#color2',
            // ... 2 to 10 colors
        ]
    },
    myScheme_dark: {
        name: 'My Scheme Dark',
        colors: [
            '#darkColor1',
            '#darkColor2',
            // ... 2 to 10 colors
        ]
    }
};
```

### From Tailwind Palette

If you have a Tailwind palette, extract the DEFAULT or specific shade values:

```javascript
oceanBlue: {
    name: 'Ocean Blue',
    colors: [
        '#1e3a8a', // blue-900
        '#3b82f6', // blue-500
        '#60a5fa', // blue-400
        // etc.
    ]
}
```

## Color Scheme Logic

- Schemes support 2-10 colors
- If fewer than 10 colors provided, they're intelligently repeated
- First color is used for background
- Text color automatically contrasts with background
- All 10 colors available for charts/visualizations

## Current Status

✅ Boilerplate with Alpine.js + Tailwind + Pines
✅ Title and subtitle
✅ 4 color themes with visual preview dropdown
✅ Flat design (no shadows, no gradients)
✅ Settings modal with gear icon
✅ Theme selector with color swatches
✅ GitHub link in header
✅ Structured for future settings

### Next Steps

- Add data loading (CSV files)
- Add charts (Chart.js)
- Add PDF export button to settings
- Add more themes as needed
