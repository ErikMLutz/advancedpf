// Taxes Stacked Bar Chart

/**
 * Create taxes stacked bar chart (federal, state, social security, medicare)
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Income data with years and tax breakdown arrays
 * @param {Object} classified - Classified color scheme
 * @param {Array<number|null>} effectiveRates - Effective tax rate per year (0-100), null if no income
 * @param {Object|null} projectedTax - { year, total, rate } from budget config
 */
function createTaxesChart(canvasId, data, classified, effectiveRates = [], projectedTax = null) {
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

    // Add projected year to labels/data if not already present
    const labels = projectedTax && !data.years.includes(projectedTax.year)
        ? [...data.years, projectedTax.year]
        : [...data.years];
    const projectedIdx = projectedTax ? labels.indexOf(projectedTax.year) : -1;

    const datasets = taxDatasets.map((ds, i) => ({
        label: ds.label,
        data: projectedTax && !data.years.includes(projectedTax.year)
            ? [...data[ds.key], 0]
            : data[ds.key],
        backgroundColor: chartColors[i % chartColors.length],
        borderWidth: 0,
        stack: 'taxes'
    }));

    // Combined plugin: dashed projected box + effective rate labels
    const combinedPlugin = {
        id: 'taxesPlugins',
        afterDatasetsDraw(chart) {
            const { ctx: c, scales } = chart;

            // Dashed box for projected year
            if (projectedIdx >= 0 && projectedTax) {
                const meta = chart.getDatasetMeta(0);
                const bar = meta.data[projectedIdx];
                if (bar) {
                    const halfW = bar.width / 2;
                    const top = scales.y.getPixelForValue(projectedTax.total);
                    const bottom = scales.y.getPixelForValue(0);
                    c.save();
                    c.strokeStyle = classified.chart1;
                    c.lineWidth = 1.5;
                    c.setLineDash([5, 4]);
                    c.strokeRect(bar.x - halfW, top, bar.width, bottom - top);
                    c.restore();
                }
            }

            // Effective rate labels above each bar
            c.save();
            c.font = '300 11px sans-serif';
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'center';

            labels.forEach((_, colIdx) => {
                const rate = colIdx === projectedIdx
                    ? Math.round(projectedTax.rate * 100)
                    : effectiveRates[colIdx];
                if (rate === null || rate === undefined) return;

                let total = colIdx === projectedIdx
                    ? projectedTax.total
                    : 0;

                if (colIdx !== projectedIdx) {
                    chart.data.datasets.forEach((ds, dsIdx) => {
                        if (!chart.getDatasetMeta(dsIdx).hidden) {
                            total += ds.data[colIdx] || 0;
                        }
                    });
                }

                const x = scales.x.getPixelForValue(colIdx);
                const y = scales.y.getPixelForValue(total);
                c.fillText(rate + '%', x, y - 6);
            });

            c.restore();
        }
    };

    window.taxesChart = new Chart(ctx, {
        type: 'bar',
        plugins: [combinedPlugin],
        data: { labels, datasets },
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
                            if (context.dataIndex === projectedIdx) {
                                // Only show on the first dataset to avoid repeats
                                if (context.datasetIndex !== 0) return null;
                                return `projected: $${fmtK(projectedTax.total, 1)}k (${Math.round(projectedTax.rate * 100)}%)`;
                            }
                            const value = context.parsed.y;
                            if (!value) return null;
                            return `${context.dataset.label}: $${fmtK(value, 1)}k`;
                        },
                        footer: function(items) {
                            if (items[0]?.dataIndex === projectedIdx) return '';
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
                    suggestedMax: (() => {
                        const historicMax = Math.max(...data.years.map((_, i) =>
                            (data.federalTax[i] || 0) + (data.stateTax[i] || 0) +
                            (data.socialSecurity[i] || 0) + (data.medicare[i] || 0)
                        ), 0);
                        const projMax = projectedTax ? projectedTax.total : 0;
                        return Math.max(historicMax, projMax) * 1.05;
                    })(),
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
