// Finance Dashboard - Configuration

const CONFIG = {
    // Color palettes (arrays of hex colors)
    colorschemes: {
        'tableau10': {
            name: 'Tableau 10 (Default)',
            colors: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC']
        },
        'paired': {
            name: 'Brewer Paired',
            colors: ['#A6CEE3', '#1F78B4', '#B2DF8A', '#33A02C', '#FB9A99', '#E31A1C', '#FDBF6F', '#FF7F00', '#CAB2D6', '#6A3D9A']
        },
        'dark': {
            name: 'Brewer Dark (PDF)',
            colors: ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666']
        },
        'pastel': {
            name: 'Pastel',
            colors: ['#FBB4AE', '#B3CDE3', '#CCEBC5', '#DECBE4', '#FED9A6', '#FFFFCC', '#E5D8BD', '#FDDAEC']
        },
        'colorblind': {
            name: 'Colorblind Safe',
            colors: ['#0173B2', '#DE8F05', '#029E73', '#CC78BC', '#CA9161', '#949494', '#ECE133', '#56B4E9']
        }
    },

    // Default colorscheme
    defaultColorscheme: 'tableau10',

    // Data file paths (relative to server root)
    dataPaths: {
        cash: '/data/cash.csv',
        property: '/data/property.csv',
        debt: '/data/debt.csv',
        securities: '/data/securities.csv',
        credit: '/data/credit.csv',
        manifest: '/data/manifest.csv'
    },

    // Chart display options
    charts: {
        currencyFormat: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        },
        defaultMonths: 12,  // Default time range for most charts
        allTimeStartDate: '2013-09'  // Starting point for all-time chart
    },

    // PDF export options
    pdf: {
        orientation: 'landscape',
        format: 'a4',
        scale: 2  // Higher quality
    }
};
