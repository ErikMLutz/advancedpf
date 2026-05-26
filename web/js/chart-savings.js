// Savings Stacked Bar Chart

/**
 * Create savings stacked bar chart by category
 * @param {string} canvasId - Canvas element ID
 * @param {{ years: string[], datasets: Array<{category: string, data: number[]}> }} data
 * @param {Object} classified - Classified color scheme
 * @param {Array<number|null>} savingsRates - Savings rate per year (0-100), null if no income data
 * @param {Object|null} projectedSavings - { year, by_category, total } from budget config
 */
function createSavingsChart(canvasId, data, classified, savingsRates = [], projectedSavings = null) {
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

    const projectedIdx = projectedSavings
        ? data.years.indexOf(projectedSavings.year)
        : -1;

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

    // Projected dashed bars: one dataset per category showing the remaining planned amount
    if (projectedSavings && projectedIdx >= 0) {
        const allCategories = [
            ...data.datasets.map(ds => ds.category),
            ...Object.keys(projectedSavings.by_category).filter(
                cat => !data.datasets.some(ds => ds.category === cat)
            )
        ];

        allCategories.forEach((category, i) => {
            const planned = projectedSavings.by_category[category]?.goal ?? projectedSavings.by_category[category] ?? 0;
            const actualDs = data.datasets.find(ds => ds.category === category);
            const actual = actualDs ? (actualDs.data[projectedIdx] || 0) : 0;
            const remaining = Math.max(0, planned - actual);
            if (remaining <= 0) return;

            const color = chartColors[i % chartColors.length];
            const projData = data.years.map((_, yi) => yi === projectedIdx ? remaining : null);

            datasets.push({
                label: category + ' (planned)',
                data: projData,
                backgroundColor: color + '28', // ~16% opacity fill
                borderWidth: 0,
                stack: 'savings',
                _projected: true,
                _color: color
            });
        });
    }

    // Plugin: draw dashed borders over projected bars, rate label above each stack
    const combinedPlugin = {
        id: 'savingsPlugins',
        afterDatasetsDraw(chart) {
            const { ctx: c, scales } = chart;

            // Dashed borders for projected bars
            c.save();
            chart.data.datasets.forEach((dataset, dsIdx) => {
                if (!dataset._projected) return;
                const meta = chart.getDatasetMeta(dsIdx);
                meta.data.forEach((bar) => {
                    if (!bar || bar.base === bar.y) return;
                    const halfW = bar.width / 2;
                    c.strokeStyle = dataset._color;
                    c.lineWidth = 1.5;
                    c.setLineDash([5, 4]);
                    c.strokeRect(bar.x - halfW, bar.y, bar.width, bar.base - bar.y);
                    c.setLineDash([]);
                });
            });
            c.restore();

            // Savings rate labels above each positive stack
            c.save();
            c.font = '300 11px sans-serif';
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'center';

            chart.data.labels.forEach((_, colIdx) => {
                const rate = savingsRates[colIdx];
                if (rate === null || rate === undefined) return;

                let total = 0;
                chart.data.datasets.forEach((ds, dsIdx) => {
                    if (!chart.getDatasetMeta(dsIdx).hidden) {
                        const val = ds.data[colIdx] || 0;
                        if (val > 0) total += val;
                    }
                });

                const x = scales.x.getPixelForValue(colIdx);
                const y = scales.y.getPixelForValue(total);
                c.fillText(rate + '%', x, y - 6);
            });

            c.restore();
        }
    };

    window.savingsChart = new Chart(ctx, {
        type: 'bar',
        plugins: [combinedPlugin],
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
                        padding: 12,
                        // Hide projected datasets from legend — dashed bars are self-explanatory
                        filter: (item) => !item.text.includes('(planned)')
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
                            const label = context.dataset.label.replace(' (planned)', ' planned');
                            return `${label}: $${fmtK(value, 1)}k`;
                        },
                        footer: function(items) {
                            const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `total: $${fmtK(total, 1)}k`;
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
                            return '$' + fmtK(value, 0) + 'k';
                        }
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
