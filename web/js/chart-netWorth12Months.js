// 12 Month Net Worth Chart

/**
 * Create 12-month net worth stacked bar chart with year-over-year comparison
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Chart data from compute_value_over_last_12_months
 * @param {Object} classified - Classified color scheme
 */
function create12MonthNetWorthChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    // Destroy existing chart if it exists
    if (window.netWorth12MonthsChart && typeof window.netWorth12MonthsChart.destroy === 'function') {
        window.netWorth12MonthsChart.destroy();
    }

    // Extract data
    const months = data.map(d => d.month);
    const lastYearValues = data.map(d => d.last_year_value);
    const changes = data.map(d => d.value - d.last_year_value);

    window.netWorth12MonthsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'last year',
                    data: lastYearValues,
                    backgroundColor: classified.chart1,
                    barPercentage: 0.9,
                    categoryPercentage: 0.9
                },
                {
                    label: 'change',
                    data: changes,
                    backgroundColor: classified.chart2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.9
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: classified.text,
                        font: {
                            size: 11,
                            weight: 300
                        },
                        boxWidth: 15,
                        boxHeight: 15,
                        padding: 10
                    }
                },
                title: {
                    display: false // Using HTML title instead
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.chart1,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;

                            if (datasetLabel === 'last year') {
                                return 'last year: $' + (value / 1000).toFixed(0) + 'k';
                            } else {
                                // For change, show this year's total value (stacked)
                                const lastYearValue = context.chart.data.datasets[0].data[context.dataIndex];
                                const thisYearValue = lastYearValue + value;
                                return 'this year: $' + (thisYearValue / 1000).toFixed(0) + 'k';
                            }
                        },
                        footer: function(context) {
                            // Show the change amount
                            const change = context[1] ? context[1].parsed.y : 0;
                            if (change !== 0) {
                                const sign = change > 0 ? '+' : '';
                                return '\nchange: ' + sign + '$' + (change / 1000).toFixed(0) + 'k';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11,
                            weight: 300
                        },
                        // Show every other month (like Python version)
                        callback: function(value, index) {
                            if (index % 2 === 0) {
                                return this.getLabelForValue(value);
                            }
                            return '';
                        }
                    },
                    grid: {
                        color: classified.backgroundAlt
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        font: {
                            size: 11,
                            weight: 300
                        },
                        callback: function(value) {
                            return '$' + (value / 1000).toFixed(0) + 'k';
                        }
                    },
                    grid: {
                        color: classified.backgroundAlt
                    }
                }
            }
        }
    });
}
