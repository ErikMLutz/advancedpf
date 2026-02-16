// All-Time Net Worth Chart

/**
 * Create all-time net worth line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Chart data with months and values
 * @param {Object} classified - Classified color scheme
 * @param {boolean} verbose - Show detailed category breakdown in tooltip
 * @param {Object} categoryBreakdowns - Optional category breakdowns by month {month: {category: value}}
 */
function createAllTimeNetWorthChart(canvasId, data, classified, verbose = false, categoryBreakdowns = null) {
    const ctx = document.getElementById(canvasId);

    // Destroy existing chart if it exists
    if (window.netWorthChart && typeof window.netWorthChart.destroy === 'function') {
        window.netWorthChart.destroy();
    }

    window.netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months,
            datasets: [{
                label: 'Net Worth',
                data: data.values,
                borderColor: classified.chart1,
                backgroundColor: 'transparent',
                pointBackgroundColor: classified.chart1,
                pointBorderColor: classified.chart1,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
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
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            // Show month/year
                            return context[0].label;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const month = context.label;

                            if (!verbose || !categoryBreakdowns || !categoryBreakdowns[month]) {
                                // Simple mode: just show total
                                return 'Total: $' + (value / 1000).toFixed(1) + 'k';
                            }

                            // Verbose mode: show categorized breakdown
                            const breakdown = categoryBreakdowns[month];
                            const labels = ['Total: $' + (value / 1000).toFixed(1) + 'k', ''];

                            // Add each category dynamically
                            Object.entries(breakdown)
                                .sort((a, b) => b[1] - a[1]) // Sort by value descending
                                .forEach(([category, categoryValue]) => {
                                    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
                                    labels.push(formattedCategory + ': $' + (categoryValue / 1000).toFixed(1) + 'k');
                                });

                            return labels;
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
                        font: {
                            size: 11,
                            weight: 300
                        },
                        // Only show years (January of each year)
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            // Only show if it's January (ends with -01)
                            if (label.endsWith('-01')) {
                                return label.split('-')[0]; // Return just the year
                            }
                            return '';
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

