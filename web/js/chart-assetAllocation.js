// Asset Allocation Pie Chart

/**
 * Create asset allocation pie chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Asset allocation data with category, value, proportion
 * @param {Object} classified - Classified color scheme
 * @param {boolean} printMode - When true, show labels for all slices (no threshold)
 */
function createAssetAllocationChart(canvasId, data, classified, printMode = false) {
    const ctx = document.getElementById(canvasId);

    // Destroy existing chart if it exists
    if (window.assetAllocationChart && typeof window.assetAllocationChart.destroy === 'function') {
        window.assetAllocationChart.destroy();
    }

    // Extract data
    const labels = data.map(d => d.category);
    const values = data.map(d => d.value);
    const proportions = data.map(d => d.proportion);

    // Generate colors using chart colors (cycle through chart1-5)
    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];
    const colors = labels.map((_, i) => chartColors[i % chartColors.length]);

    // Store args so print handlers can re-invoke with printMode toggled
    window._assetAllocationArgs = { canvasId, data, classified };

    window.assetAllocationChart = new Chart(ctx, {
        type: 'pie',
        plugins: [ChartDataLabels],  // Register datalabels plugin for this chart
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: classified.background,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 70  // Add more padding to prevent label cutoff
            },
            plugins: {
                legend: {
                    display: false  // Hide legend since we're showing labels on slices
                },
                title: {
                    display: false // Using HTML title instead
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const proportion = proportions[context.dataIndex];
                            const value = context.parsed;
                            return ` $${(value / 1000).toFixed(0)}k (${(proportion * 100).toFixed(0)}%)`;
                        }
                    }
                },
                datalabels: {
                    color: classified.textSubtle,
                    font: {
                        size: 11,
                        weight: 400
                    },
                    display: printMode ? true : (context) => proportions[context.dataIndex] >= 0.05,
                    formatter: function(value, context) {
                        const label = context.chart.data.labels[context.dataIndex];
                        const proportion = proportions[context.dataIndex];
                        return `${label}\n$${(value / 1000).toFixed(0)}k\n${(proportion * 100).toFixed(0)}%`;
                    },
                    textAlign: 'center',
                    anchor: 'end',
                    align: 'end',
                    offset: 4
                }
            }
        }
    });

}
