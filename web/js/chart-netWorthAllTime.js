// All-Time Net Worth Chart

/**
 * Create all-time net worth line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Chart data with months and values
 * @param {Object} classified - Classified color scheme
 * @param {Object} categoryBreakdowns - Category breakdowns by month {month: {category: value}}
 * @param {Object|null} projection - Projected data { months, values, annualRate }
 */
function createAllTimeNetWorthChart(canvasId, data, classified, categoryBreakdowns = null, projection = null) {
    const ctx = document.getElementById(canvasId);

    // Destroy existing chart if it exists
    if (window.netWorthChart && typeof window.netWorthChart.destroy === 'function') {
        window.netWorthChart.destroy();
    }

    // Merge actual + projected months for a unified x-axis
    const projMonthSet = new Set(projection ? projection.months.slice(1) : []);
    const allLabels = [...data.months, ...(projection ? projection.months.slice(1) : [])];

    // Actual data: null for projected months so the line stops cleanly
    const actualValues = allLabels.map(m => projMonthSet.has(m) ? null : data.values[data.months.indexOf(m)]);

    // Projection data: null for actual months (except the last real point for continuity)
    const lastActualMonth = data.months[data.months.length - 1];
    const projValueMap = projection ? Object.fromEntries(projection.months.map((m, i) => [m, projection.values[i]])) : {};
    const projValues = allLabels.map(m => (m === lastActualMonth || projMonthSet.has(m)) ? (projValueMap[m] ?? null) : null);

    const datasets = [{
        label: 'net worth',
        data: actualValues,
        borderColor: classified.chart1,
        backgroundColor: 'transparent',
        pointBackgroundColor: classified.chart1,
        pointBorderColor: classified.chart1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1
    }];

    if (projection) {
        const rateLabel = (projection.annualRate >= 0 ? '+' : '') + (projection.annualRate * 100).toFixed(1) + '%/yr';
        datasets.push({
            label: `projected (${rateLabel})`,
            data: projValues,
            borderColor: classified.chart1,
            backgroundColor: 'transparent',
            pointBackgroundColor: classified.chart1,
            pointBorderColor: classified.chart1,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
        });
    }

    window.netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets
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
                    filter: function(item) {
                        if (item.parsed.y === null) return false;
                        // Suppress projection dataset entry at the last actual month (shown by actual dataset)
                        if (item.datasetIndex === 1 && !projMonthSet.has(item.label)) return false;
                        return true;
                    },
                    callbacks: {
                        title: function(context) {
                            // Show month/year
                            return context[0].label;
                        },
                        label: function(context) {
                            if (context.parsed.y === null) return null;
                            const value = context.parsed.y;
                            const month = context.label;

                            // Projected months: show projected value + rate
                            if (projMonthSet.has(month)) {
                                const rateLabel = (projection.annualRate >= 0 ? '+' : '') + (projection.annualRate * 100).toFixed(1) + '%/yr';
                                return ['projected: $' + fmtK(value, 1) + 'k', rateLabel];
                            }

                            if (!categoryBreakdowns || !categoryBreakdowns[month]) {
                                return 'total: $' + fmtK(value, 1) + 'k';
                            }

                            // Show categorized breakdown
                            const breakdown = categoryBreakdowns[month];
                            const labels = ['total: $' + fmtK(value, 1) + 'k', ''];

                            // Add each category dynamically
                            Object.entries(breakdown)
                                .filter(([, categoryValue]) => categoryValue !== 0)
                                .sort((a, b) => b[1] - a[1]) // Sort by value descending
                                .forEach(([category, categoryValue]) => {
                                    labels.push(category + ': $' + fmtK(categoryValue, 1) + 'k');
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
                            return '$' + fmtK(value, 0) + 'k';
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

