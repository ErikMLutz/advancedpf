// Income Allocation 100% Stacked Bar Chart
// Shows where income goes each year: taxes, savings, credit spending, uncategorized

/**
 * Create income allocation chart (100% stacked bars per year)
 * @param {string} canvasId - Canvas element ID
 * @param {{ years, taxes, savings, credit, uncategorized }} data - Percentage arrays per year
 * @param {Object} classified - Classified color scheme
 */
function createIncomeAllocationChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.incomeAllocationChart && typeof window.incomeAllocationChart.destroy === 'function') {
        window.incomeAllocationChart.destroy();
    }

    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4
    ];

    const datasets = [
        { label: 'Taxes',         key: 'taxes' },
        { label: 'Savings',       key: 'savings' },
        { label: 'Credit Spend',  key: 'credit' },
        { label: 'Uncategorized', key: 'uncategorized' }
    ].map((ds, i) => ({
        label: ds.label,
        data: data[ds.key],
        backgroundColor: chartColors[i],
        borderWidth: 0,
        stack: 'allocation'
    }));

    window.incomeAllocationChart = new Chart(ctx, {
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
                            return `${context.dataset.label}: ${value.toFixed(1)}%`;
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
                    min: 0,
                    max: 100,
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
