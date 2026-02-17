// Taxes Stacked Bar Chart

/**
 * Create taxes stacked bar chart (federal, state, social security, medicare)
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Income data with years and tax breakdown arrays
 * @param {Object} classified - Classified color scheme
 * @param {Array<number|null>} effectiveRates - Effective tax rate per year (0-100), null if no income
 */
function createTaxesChart(canvasId, data, classified, effectiveRates = []) {
    const ctx = document.getElementById(canvasId);

    if (window.taxesChart && typeof window.taxesChart.destroy === 'function') {
        window.taxesChart.destroy();
    }

    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];

    const taxDatasets = [
        { label: 'federal income tax', key: 'federalTax' },
        { label: 'state income tax',   key: 'stateTax' },
        { label: 'social security',    key: 'socialSecurity' },
        { label: 'medicare',           key: 'medicare' }
    ];

    const datasets = taxDatasets.map((ds, i) => ({
        label: ds.label,
        data: data[ds.key],
        backgroundColor: chartColors[i % chartColors.length],
        borderWidth: 0,
        stack: 'taxes'
    }));

    // Inline plugin: draw effective tax rate above each stacked bar total
    const effectiveRatePlugin = {
        id: 'effectiveRateLabels',
        afterDatasetsDraw(chart) {
            const { ctx, scales } = chart;
            ctx.save();
            ctx.font = '300 11px sans-serif';
            ctx.fillStyle = classified.textSubtle;
            ctx.textAlign = 'center';

            chart.data.labels.forEach((_, colIdx) => {
                const rate = effectiveRates[colIdx];
                if (rate === null || rate === undefined) return;

                let total = 0;
                chart.data.datasets.forEach((ds, dsIdx) => {
                    if (!chart.getDatasetMeta(dsIdx).hidden) {
                        total += ds.data[colIdx] || 0;
                    }
                });

                const x = scales.x.getPixelForValue(colIdx);
                const y = scales.y.getPixelForValue(total);
                ctx.fillText(rate + '%', x, y - 6);
            });

            ctx.restore();
        }
    };

    window.taxesChart = new Chart(ctx, {
        type: 'bar',
        plugins: [effectiveRatePlugin],
        data: {
            labels: data.years,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 24 } },
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
