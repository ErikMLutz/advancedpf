// Income Chart

/**
 * Create income bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Income data with years and values {years: [], values: []}
 * @param {Object} classified - Classified color scheme
 */
function createIncomeChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    // Destroy existing chart if it exists
    if (window.incomeChart && typeof window.incomeChart.destroy === 'function') {
        window.incomeChart.destroy();
    }

    window.incomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.years,
            datasets: [{
                label: 'total income',
                data: data.values,
                backgroundColor: classified.chart1,
                borderColor: classified.chart1,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
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
                            return 'Income: $' + (value / 1000).toFixed(1) + 'k';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: classified.textSubtle,
                        font: {
                            size: 11,
                            weight: 300
                        }
                    },
                    grid: {
                        color: classified.backgroundAlt
                    }
                },
                y: {
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
