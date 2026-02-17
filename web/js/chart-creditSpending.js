// Credit Card Spending Chart
// Replicates Python create_spending_plot: bars for spend + 2 trailing average lines

/**
 * Create credit card spending chart (bars + this year / last year trailing avg lines)
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Output of computeValueOverLast12Months([credit])
 * @param {Object} classified - Classified color scheme
 */
function createCreditSpendingChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.creditSpendingChart && typeof window.creditSpendingChart.destroy === 'function') {
        window.creditSpendingChart.destroy();
    }

    const labels = data.map(d => d.month);
    // Credit values are negative (spending), negate to show as positive amounts
    const spendValues = data.map(d => -d.value);
    const thisYearAvg = data.map(d =>
        d.value_6_month_rolling_average !== null ? -d.value_6_month_rolling_average : null
    );
    const lastYearAvg = data.map(d =>
        d.last_year_value_6_month_rolling_average !== null ? -d.last_year_value_6_month_rolling_average : null
    );

    window.creditSpendingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'spend',
                    data: spendValues,
                    backgroundColor: classified.chart1,
                    borderWidth: 0,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Trailing avg (this year)',
                    data: thisYearAvg,
                    borderColor: classified.chart2,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: classified.chart2,
                    pointBorderColor: classified.chart2,
                    pointRadius: 2,
                    borderWidth: 2,
                    spanGaps: false,
                    order: 1
                },
                {
                    type: 'line',
                    label: 'Trailing avg (last year)',
                    data: lastYearAvg,
                    borderColor: classified.chart3,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: classified.chart3,
                    pointBorderColor: classified.chart3,
                    pointRadius: 2,
                    borderWidth: 2,
                    borderDash: [5, 4],
                    spanGaps: false,
                    order: 1
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
                        boxWidth: 12,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.chart1,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            if (value === null) return null;
                            return `${context.dataset.label}: $${(value / 1000).toFixed(1)}k`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        maxRotation: 45
                    },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
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
