// Retirement Tax Treatment Pie Chart

/**
 * Create retirement tax allocation pie chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Array of {treatment, value, proportion}
 * @param {Object} classified - Classified color scheme
 */
function createRetirementTaxAllocationChart(canvasId, data, classified) {
    const ctx = document.getElementById(canvasId);

    if (window.retirementTaxAllocationChart && typeof window.retirementTaxAllocationChart.destroy === 'function') {
        window.retirementTaxAllocationChart.destroy();
    }

    const labels = data.map(d => d.treatment);
    const values = data.map(d => d.value);
    const proportions = data.map(d => d.proportion);

    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];
    const colors = labels.map((_, i) => chartColors[i % chartColors.length]);

    window.retirementTaxAllocationChart = new Chart(ctx, {
        type: 'pie',
        plugins: [ChartDataLabels],
        data: {
            labels,
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
                padding: 70
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
                tooltip: {
                    enabled: false
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
                    anchor: 'end',
                    align: 'end',
                    offset: 4
                }
            }
        }
    });
}
