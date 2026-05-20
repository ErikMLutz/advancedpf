// Budget Income Sankey Chart

/**
 * Create a Sankey diagram showing income sources flowing into gross income.
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Budget income data { salary, bonus, RSU, LTC, ESPP, total }
 * @param {Object} classified - Classified color scheme
 */
function createBudgetIncomeSankeyChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetIncomeSankeyChart &&
        typeof window.budgetIncomeSankeyChart.destroy === 'function') {
        window.budgetIncomeSankeyChart.destroy();
    }

    const sourceColors = {
        'salary': classified.chart1,
        'bonus':  classified.chart2,
        'RSU':    classified.chart3,
        'LTC':    classified.chart4,
        'ESPP':   classified.chart5,
    };

    const flows = Object.entries(sourceColors)
        .filter(([key]) => (data[key] || 0) > 0)
        .map(([key]) => ({ from: key, to: 'gross income', flow: data[key] }));

    window.budgetIncomeSankeyChart = new Chart(ctx, {
        type: 'sankey',
        data: {
            datasets: [{
                data: flows,
                colorFrom: (c) => {
                    const label = c.dataset.data[c.dataIndex]?.from;
                    return sourceColors[label] || classified.chart1;
                },
                colorTo: (c) => {
                    const label = c.dataset.data[c.dataIndex]?.to;
                    return label === 'gross income' ? classified.accent : classified.chart1;
                },
                colorMode: 'gradient',
                alpha: 0.5,
                borderWidth: 0,
                nodeWidth: 12,
                color: classified.text,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const flow = context.dataset.data[context.dataIndex]?.flow ?? 0;
                            return '$' + fmtK(flow, 1) + 'k';
                        }
                    }
                }
            }
        }
    });
}
