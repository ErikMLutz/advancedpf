// Net Worth YoY Growth Chart
// Shows month-by-month % change in net worth vs the same month one year prior

/**
 * Create net worth YoY growth line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array<{month: string, growth: number}>} data - Growth data points
 * @param {Object} classified - Classified color scheme
 */
function createNetWorthGrowthChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.netWorthGrowthChart && typeof window.netWorthGrowthChart.destroy === 'function') {
        window.netWorthGrowthChart.destroy();
    }

    const labels = data.map(d => d.month);
    const values = data.map(d => d.growth);
    const movingAvg = rollingAverageCentered(values, 12);

    window.netWorthGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'yoy growth',
                    data: values,
                    borderColor: classified.chart1,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: classified.chart1,
                    tension: 0.1
                },
                {
                    label: '12m avg',
                    data: movingAvg,
                    borderColor: classified.chart2,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [5, 4],
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    pointBackgroundColor: classified.chart2,
                    tension: 0.1
                },
                {
                    // Zero reference line
                    label: '_zero',
                    data: labels.map(() => 0),
                    borderColor: classified.textSubtle,
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        boxWidth: 20,
                        padding: 12,
                        filter: item => !item.text.startsWith('_')
                    }
                },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.chart1,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    filter: item => !item.dataset.label.startsWith('_'),
                    callbacks: {
                        title: context => context[0].label,
                        label: context => {
                            const v = context.parsed.y;
                            if (v === null) return null;
                            const sign = v >= 0 ? '+' : '';
                            return `${context.dataset.label}: ${sign}${v.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: classified.textSubtle,
                        maxRotation: 0,
                        minRotation: 0,
                        font: { size: 11, weight: 300 },
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
                        callback: value => value + '%'
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
