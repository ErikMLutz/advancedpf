// Income Chart

/**
 * Create income bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Income data with years and values {years: [], values: []}
 * @param {Object} classified - Classified color scheme
 * @param {Array} projectedIncomes - Array of projected years { year, value } not yet in income.csv
 */
function createIncomeChart(canvasId, data, classified, projectedIncomes = []) {
    const ctx = document.getElementById(canvasId);

    if (window.incomeChart && typeof window.incomeChart.destroy === 'function') {
        window.incomeChart.destroy();
    }

    const labels = [...data.years, ...projectedIncomes.map(p => p.year)];
    const values = [...data.values, ...projectedIncomes.map(p => p.value)];
    const projectedStartIndex = data.years.length;
    const hasProjected = projectedIncomes.length > 0;

    const backgroundColors = labels.map((_, i) =>
        i >= projectedStartIndex ? classified.chart1 + '33' : classified.chart1
    );

    // Plugin: draws a dashed rectangle border over each projected bar
    const dashedProjectionPlugin = {
        id: 'dashedProjectionBars',
        afterDatasetsDraw(chart) {
            if (!hasProjected) return;
            const { ctx: c } = chart;
            const meta = chart.getDatasetMeta(0);
            c.save();
            c.strokeStyle = classified.chart1;
            c.lineWidth = 1.5;
            c.setLineDash([5, 4]);
            for (let i = projectedStartIndex; i < labels.length; i++) {
                const bar = meta.data[i];
                if (!bar || bar.base === bar.y) continue;
                const halfW = bar.width / 2;
                c.strokeRect(bar.x - halfW, bar.y, bar.width, bar.base - bar.y);
            }
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
        plugins: hasProjected ? [dashedProjectionPlugin] : [],
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
                            const isProjected = context.dataIndex >= projectedStartIndex;
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
