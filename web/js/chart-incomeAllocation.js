// Income Allocation Stacked Bar Chart
// Shows where income goes each year as % of income: taxes, savings, credit spending
// A reference line at 100% marks full income. Bars above = spending more than earned.

/**
 * Create income allocation chart (stacked bars as % of income, with 100% reference line)
 * @param {string} canvasId - Canvas element ID
 * @param {{ years, taxes, savings, credit }} data - Percentage arrays per year
 * @param {Object} classified - Classified color scheme
 */
function createIncomeAllocationChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.incomeAllocationChart && typeof window.incomeAllocationChart.destroy === 'function') {
        window.incomeAllocationChart.destroy();
    }

    const barDatasets = [
        { label: 'taxes',        key: 'taxes',   color: classified.chart1 },
        { label: 'savings',      key: 'savings',  color: classified.chart2 },
        { label: 'credit spend', key: 'credit',   color: classified.chart3 },
    ].map(ds => ({
        label: ds.label,
        data: data[ds.key],
        backgroundColor: ds.color,
        borderWidth: 0,
        stack: 'allocation',
        type: 'bar',
        order: 1
    }));

    // Reference line at 100%
    const referenceLine = {
        label: '100% of income',
        data: data.years.map(() => 100),
        type: 'line',
        borderColor: classified.textSubtle,
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        stack: undefined,
        order: 0
    };

    window.incomeAllocationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.years,
            datasets: [...barDatasets, referenceLine]
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
                        filter: (item) => item.text !== '100% of income'
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
                            if (context.dataset.label === '100% of income') return null;
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
