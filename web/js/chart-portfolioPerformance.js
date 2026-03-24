// Portfolio Performance Chart
// Estimated yearly rate of return by category:
//   return = (end value - start value - savings contributions) / |start value|
// Investment property values are netted against linked debt.

/**
 * Create portfolio performance grouped bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {{ years: string[], categories: string[], data: Object }} data
 * @param {Object} classified - Classified color scheme
 */
function createPortfolioPerformanceChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.portfolioPerformanceChart && typeof window.portfolioPerformanceChart.destroy === 'function') {
        window.portfolioPerformanceChart.destroy();
    }

    const categoryColors = {
        'retirement securities': classified.chart1,
        'investment property':   classified.chart2,
        'securities':            classified.chart3
    };

    const datasets = data.categories.map(category => ({
        label: category,
        data: data.data[category],
        backgroundColor: categoryColors[category],
        borderWidth: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.8
    }));

    window.portfolioPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.years,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        boxWidth: 12,
                        padding: 12,
                        filter: item => data.data[item.text] && data.data[item.text].some(v => v !== null)
                    }
                },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const v = context.parsed.y;
                            if (v === null || v === undefined) return null;
                            const sign = v >= 0 ? '+' : '';
                            return `${context.dataset.label}: ${sign}${v.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 }
                    },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: value => value + '%'
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
