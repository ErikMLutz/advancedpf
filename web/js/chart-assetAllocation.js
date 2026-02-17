// Asset Allocation Pie Chart

/**
 * Create asset allocation pie chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Asset allocation data with category, value, proportion
 * @param {Object} classified - Classified color scheme
 */
function createAssetAllocationChart(canvasId, data, classified) {
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
                    enabled: false  // Disabled since labels are shown on slices
                },
                datalabels: {
                    color: classified.textSubtle,
                    font: {
                        size: 11,
                        weight: 400
                    },
                    formatter: function(value, context) {
                        const label = context.chart.data.labels[context.dataIndex];
                        const proportion = proportions[context.dataIndex];
                        return `${label}\n$${(value / 1000).toFixed(0)}k\n${(proportion * 100).toFixed(0)}%`;
                    },
                    textAlign: 'center',
                    anchor: 'end',     // Position anchor at edge of pie slice
                    align: 'end',      // Align label away from center (outside)
                    offset: 4          // Small offset from the edge
                }
            }
        }
    });
}
