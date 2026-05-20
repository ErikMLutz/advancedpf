// Budget Income Sankey Chart

/**
 * Create a Sankey diagram showing income sources → gross income → savings categories.
 * @param {string} canvasId - Canvas element ID
 * @param {Object} income - Income data { salary, bonus, RSU, LTC, ESPP, total }
 * @param {Object|null} savings - Savings data { total, by_category }
 * @param {Object} classified - Classified color scheme
 */
function createBudgetIncomeSankeyChart(canvasId, income, savings, classified) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetIncomeSankeyChart &&
        typeof window.budgetIncomeSankeyChart.destroy === 'function') {
        window.budgetIncomeSankeyChart.destroy();
    }

    const incomeSourceColors = {
        'salary': classified.chart1,
        'bonus':  classified.chart2,
        'rsu':    classified.chart3,
        'ltc':    classified.chart4,
        'espp':   classified.chart5,
    };

    const keyMap = { salary: 'salary', bonus: 'bonus', RSU: 'rsu', LTC: 'ltc', ESPP: 'espp' };

    // Income source → gross income flows
    const flows = Object.entries(keyMap)
        .filter(([dataKey]) => (income[dataKey] || 0) > 0)
        .map(([dataKey, label]) => ({
            from: label,
            to: 'gross income',
            flow: income[dataKey],
            _color: incomeSourceColors[label]
        }));

    // Savings category colors (cycle through chart colors)
    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5,
    ];

    // Gross income → savings → individual buckets
    if (savings?.by_category && savings.total > 0) {
        flows.push({
            from: 'gross income',
            to: 'savings',
            flow: savings.total,
            _color: classified.accent
        });

        Object.entries(savings.by_category).forEach(([category, value], i) => {
            if (value <= 0) return;
            const color = chartColors[i % chartColors.length];
            flows.push({
                from: 'savings',
                to: category,
                flow: value,
                _color: color
            });
        });
    }

    window.budgetIncomeSankeyChart = new Chart(ctx, {
        type: 'sankey',
        data: {
            datasets: [{
                data: flows,
                colorFrom: (c) => {
                    const d = c.dataset.data[c.dataIndex];
                    return d?._color || classified.chart1;
                },
                colorTo: (c) => {
                    const d = c.dataset.data[c.dataIndex];
                    if (d?.to === 'gross income' || d?.to === 'savings') return classified.accent;
                    return d?._color || classified.chart1;
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
