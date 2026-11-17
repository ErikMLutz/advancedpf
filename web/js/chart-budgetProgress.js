// Budget Progress Chart
// Horizontal bar chart: progress vs annual targets for a set of rows

/**
 * @param {string} canvasId
 * @param {Array}  rows       - [{ label, annualBudget, actual, type }]
 *                              type: 'savings' | 'discretionary'
 *                              optional: marker { value, label } — vertical line at value
 *                              optional: details [string] — replaces default tooltip lines
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
                const target = rows[i].annualBudget;
                const spent = spentData[i] + overrunData[i];
                if (target <= 0) return;
                const pct = Math.round(spent / target * 100);
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

    const hasMarker = rows.some(r => r.marker);
    const markerPlugin = {
        id: canvasId + 'Marker',
        afterDatasetsDraw(chart) {
            const { ctx: c, chartArea, scales } = chart;
            c.save();
            c.strokeStyle = classified.text;
            c.fillStyle = classified.textSubtle;
            c.font = '11px sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'bottom';
            c.lineWidth = 1.5;
            c.setLineDash([4, 3]);
            chart.getDatasetMeta(0).data.forEach((bar, i) => {
                const m = rows[i].marker;
                if (!m) return;
                const x = scales.x.getPixelForValue(m.value);
                const half = bar.height / 2 + 4;
                c.beginPath();
                c.moveTo(x, bar.y - half);
                c.lineTo(x, bar.y + half);
                c.stroke();
                if (m.label) c.fillText(m.label, x, bar.y - half - 2);
            });
            c.restore();
        }
    };
    const xMax = Math.max(...rows.map((r, i) =>
        Math.max(r.annualBudget, r.actual, r.marker?.value || 0)));

    window[canvasId] = new Chart(ctx, {
        type: 'bar',
        plugins: hasMarker ? [pctPlugin, markerPlugin] : [pctPlugin],
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
            layout: { padding: { right: 48, top: hasMarker ? 16 : 0 } },
            scales: {
                x: { stacked: true, display: false, grid: { display: false }, suggestedMax: xMax },
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
                            if (rows[i].details) return rows[i].details;
                            const spent = spentData[i] + overrunData[i];
                            const annualBudget = spentData[i] + remainingData[i] + overrunData[i];
                            const isSavings = rows[i].type === 'savings';
                            return [
                                `${isSavings ? 'saved' : 'spent'}: $${fmtK(spent)}k`,
                                `${isSavings ? 'target' : 'annual budget'}: $${fmtK(annualBudget)}k`,
                            ];
                        }
                    }
                }
            }
        }
    });
}
