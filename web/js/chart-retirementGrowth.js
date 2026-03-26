// Retirement Growth Chart
// Stacked area chart showing cumulative contributions (bottom) vs total balance (top).
// The gap between the two areas represents market/investment gains over time.

/**
 * Create retirement growth chart
 * @param {string} canvasId - Canvas element ID
 * @param {{ months: string[], balances: number[], cumulativeContributions: number[] }} data
 * @param {Object} classified - Classified color scheme
 */
function createRetirementGrowthChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.retirementGrowthChart && typeof window.retirementGrowthChart.destroy === 'function') {
        window.retirementGrowthChart.destroy();
    }

    // chart2 fills down to chart1 (gains layer); chart1 fills to origin (contributions layer)
    const contribColor = classified.chart1;
    const balanceColor = classified.chart2;

    window.retirementGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months,
            datasets: [
                {
                    label: 'contributions',
                    data: data.cumulativeContributions,
                    borderColor: contribColor,
                    backgroundColor: contribColor + '55',
                    fill: 'origin',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0,
                    order: 1
                },
                {
                    label: 'total balance',
                    data: data.balances,
                    borderColor: balanceColor,
                    backgroundColor: balanceColor + '33',
                    fill: '-1',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.1,
                    order: 0
                }
            ]
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
                        boxWidth: 10,
                        padding: 12,
                        usePointStyle: true
                    }
                },
                datalabels: { display: false },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title: ctx => ctx[0].label,
                        label: function(context) {
                            const v = context.parsed.y;
                            const label = context.dataset.label;
                            const fmt = n => '$' + fmtK(n, 1) + 'k';
                            if (label === 'total balance') {
                                const contrib = data.cumulativeContributions[context.dataIndex];
                                const gains = v - contrib;
                                const gainsPct = contrib > 0 ? (gains / contrib * 100).toFixed(1) : null;
                                return [
                                    `balance: ${fmt(v)}`,
                                    gainsPct !== null
                                        ? `gains: ${fmt(gains)} (${gainsPct}%)`
                                        : `gains: ${fmt(gains)}`
                                ];
                            }
                            return `contributions: ${fmt(v)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        maxRotation: 0,
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            return label.endsWith('-01') ? label.split('-')[0] : '';
                        }
                    },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: v => '$' + fmtK(v, 0) + 'k'
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
