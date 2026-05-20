// Income Chart

/**
 * Create income bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Income data with years and values {years: [], values: []}
 * @param {Object} classified - Classified color scheme
 * @param {Object|null} projectedIncome - Optional projected year { year, value }
 */
function createIncomeChart(canvasId, data, classified, projectedIncome = null) {
    const ctx = document.getElementById(canvasId);

    if (window.incomeChart && typeof window.incomeChart.destroy === 'function') {
        window.incomeChart.destroy();
    }

    const labels = projectedIncome ? [...data.years, projectedIncome.year] : [...data.years];
    const values = projectedIncome ? [...data.values, projectedIncome.value] : [...data.values];
    const projectedIndex = projectedIncome ? labels.length - 1 : -1;

    // Use a per-bar color array: projected bar gets a faint fill, others solid
    const backgroundColors = labels.map((_, i) =>
        i === projectedIndex ? classified.chart1 + '33' : classified.chart1
    );

    // Plugin: draws a dashed rectangle border over the projected bar only
    const dashedProjectionPlugin = {
        id: 'dashedProjectionBars',
        afterDatasetsDraw(chart) {
            if (projectedIndex < 0) return;
            const { ctx: c } = chart;
            const meta = chart.getDatasetMeta(0);
            const bar = meta.data[projectedIndex];
            if (!bar || bar.base === bar.y) return;
            const halfW = bar.width / 2;
            c.save();
            c.strokeStyle = classified.chart1;
            c.lineWidth = 1.5;
            c.setLineDash([5, 4]);
            c.strokeRect(bar.x - halfW, bar.y, bar.width, bar.base - bar.y);
            c.restore();
        }
    };

    window.incomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'total income',
                data: values,
                backgroundColor: backgroundColors,
                borderWidth: 0
            }]
        },
        plugins: projectedIncome ? [dashedProjectionPlugin] : [],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.chart1,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const isProjected = context.dataIndex === projectedIndex;
                            const prefix = isProjected ? 'projected: $' : 'income: $';
                            return prefix + fmtK(value, 1) + 'k';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: classified.textSubtle, font: { size: 11, weight: 300 } },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: function(value) { return '$' + fmtK(value, 0) + 'k'; }
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
