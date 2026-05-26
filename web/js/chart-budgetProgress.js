// Budget Progress Chart
// Horizontal bar chart: progress vs annual targets for a set of rows

/**
 * @param {string} canvasId
 * @param {Array}  rows       - [{ label, annualBudget, actual, type }]
 *                              type: 'savings' | 'discretionary'
 * @param {Object} classified
 */
function createBudgetProgressChart(canvasId, rows, classified) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window[canvasId] && typeof window[canvasId].destroy === 'function') {
        window[canvasId].destroy();
    }

    if (!rows || rows.length === 0) return;

    const labels = [];
    const spentData = [];
    const remainingData = [];
    const overrunData = [];
    const spentColors = [];
    const remainingColors = [];
    const overrunColors = [];

    for (const row of rows) {
        const target = row.annualBudget;
        const spent = row.actual;
        const fillColor = row.type === 'savings' ? classified.accent : classified.chart3;
        const overrunColor = row.type === 'savings' ? classified.accent : classified.chartWarn;

        labels.push(row.label);
        spentColors.push(fillColor);
        remainingColors.push(classified.backgroundAlt);
        overrunColors.push(overrunColor);

        if (target <= 0) {
            spentData.push(spent);
            remainingData.push(0);
            overrunData.push(0);
        } else if (spent <= target) {
            spentData.push(spent);
            remainingData.push(target - spent);
            overrunData.push(0);
        } else {
            spentData.push(target);
            remainingData.push(0);
            overrunData.push(spent - target);
        }
    }

    const pctPlugin = {
        id: canvasId + 'Labels',
        afterDatasetsDraw(chart) {
            const { ctx: c } = chart;
            c.save();
            c.font = '11px sans-serif';
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'left';
            c.textBaseline = 'middle';

            chart.getDatasetMeta(0).data.forEach((bar, i) => {
                const total = spentData[i] + remainingData[i] + overrunData[i];
                const spent = spentData[i] + overrunData[i];
                if (total <= 0) return;
                const pct = Math.round(spent / total * 100);
                let rightX = bar.x;
                for (let di = 0; di < chart.data.datasets.length; di++) {
                    const m = chart.getDatasetMeta(di);
                    if (m?.data[i]) rightX = Math.max(rightX, m.data[i].x);
                }
                c.fillText(`${pct}%`, rightX + 4, bar.y);
            });

            c.restore();
        }
    };

    window[canvasId] = new Chart(ctx, {
        type: 'bar',
        plugins: [pctPlugin],
        data: {
            labels,
            datasets: [
                { label: 'spent',     data: spentData,     backgroundColor: spentColors,     borderWidth: 0 },
                { label: 'remaining', data: remainingData, backgroundColor: remainingColors, borderWidth: 0 },
                { label: 'overrun',   data: overrunData,   backgroundColor: overrunColors,   borderWidth: 0 },
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 40 } },
            scales: {
                x: { stacked: true, display: false, grid: { display: false } },
                y: {
                    stacked: true,
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: classified.text, font: { size: 11 } },
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: true,
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title(items) { return items[0]?.label || ''; },
                        label(item) {
                            if (item.datasetIndex !== 0) return null;
                            const i = item.dataIndex;
                            const spent = spentData[i] + overrunData[i];
                            const annualBudget = spentData[i] + remainingData[i] + overrunData[i];
                            return [
                                `spent: $${fmtK(spent)}k`,
                                `annual budget: $${fmtK(annualBudget)}k`,
                            ];
                        }
                    }
                }
            }
        }
    });
}
