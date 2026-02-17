// Savings Stacked Bar Chart

/**
 * Create savings stacked bar chart by category
 * @param {string} canvasId - Canvas element ID
 * @param {{ years: string[], datasets: Array<{category: string, data: number[]}> }} data
 * @param {Object} classified - Classified color scheme
 */
function createSavingsChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.savingsChart && typeof window.savingsChart.destroy === 'function') {
        window.savingsChart.destroy();
    }

    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];

    const datasets = data.datasets.map((ds, i) => ({
        label: ds.category,
        data: ds.data,
        backgroundColor: chartColors[i % chartColors.length],
        borderWidth: 0,
        stack: 'savings'
    }));

    window.savingsChart = new Chart(ctx, {
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
                        padding: 12
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
                            const value = context.parsed.y;
                            if (!value) return null;
                            return `${context.dataset.label}: $${(value / 1000).toFixed(1)}k`;
                        },
                        footer: function(items) {
                            const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `Total: $${(total / 1000).toFixed(1)}k`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 }
                    },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: function(value) {
                            return '$' + (value / 1000).toFixed(0) + 'k';
                        }
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
