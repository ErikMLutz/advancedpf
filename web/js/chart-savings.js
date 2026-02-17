// Savings Stacked Bar Chart

/**
 * Create savings stacked bar chart by category
 * @param {string} canvasId - Canvas element ID
 * @param {{ years: string[], datasets: Array<{category: string, data: number[]}> }} data
 * @param {Object} classified - Classified color scheme
 * @param {Array<number|null>} savingsRates - Savings rate per year (0-100), null if no income data
 */
function createSavingsChart(canvasId, data, classified, savingsRates = []) {
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

    // Withdrawals as a separate negative bar below zero (only include if any are non-zero)
    if (data.withdrawals && data.withdrawals.some(v => v !== 0)) {
        datasets.push({
            label: 'withdrawals',
            data: data.withdrawals,
            backgroundColor: classified.chartWarn,
            borderWidth: 0,
            stack: 'savings'
        });
    }

    // Inline plugin: draw savings rate label above each stacked bar total
    const savingsRatePlugin = {
        id: 'savingsRateLabels',
        afterDatasetsDraw(chart) {
            const { ctx, scales } = chart;
            ctx.save();
            ctx.font = '300 11px sans-serif';
            ctx.fillStyle = classified.textSubtle;
            ctx.textAlign = 'center';

            chart.data.labels.forEach((_, colIdx) => {
                const rate = savingsRates[colIdx];
                if (rate === null || rate === undefined) return;

                // Sum only positive visible dataset values to find top of positive stack
                let total = 0;
                chart.data.datasets.forEach((ds, dsIdx) => {
                    if (!chart.getDatasetMeta(dsIdx).hidden) {
                        const val = ds.data[colIdx] || 0;
                        if (val > 0) total += val;
                    }
                });

                const x = scales.x.getPixelForValue(colIdx);
                const y = scales.y.getPixelForValue(total);
                ctx.fillText(rate + '%', x, y - 6);
            });

            ctx.restore();
        }
    };

    window.savingsChart = new Chart(ctx, {
        type: 'bar',
        plugins: [savingsRatePlugin],
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
