// Budget Progress Chart
// Horizontal bar chart: savings + discretionary progress vs prorated annual targets

/**
 * @param {string} canvasId
 * @param {Object} budgetYearData  - budgetData[year]: { savings, spending, ... }
 * @param {Object} savingsData     - { years, datasets } from computeSavingsAllocation
 * @param {Object} classified
 * @param {string} budgetYear      - e.g. "2026"
 */
function createBudgetProgressChart(canvasId, budgetYearData, savingsData, classified, budgetYear) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetProgressChart && typeof window.budgetProgressChart.destroy === 'function') {
        window.budgetProgressChart.destroy();
    }

    // Compute day-of-year fraction for prorating
    const today = new Date();
    const budgetYearInt = parseInt(budgetYear);
    let fraction;
    if (today.getFullYear() > budgetYearInt) {
        fraction = 1.0;
    } else if (today.getFullYear() < budgetYearInt) {
        fraction = 0;
    } else {
        const startOfYear = new Date(budgetYearInt, 0, 1);
        const startOfNextYear = new Date(budgetYearInt + 1, 0, 1);
        const daysInYear = (startOfNextYear - startOfYear) / 86400000;
        const dayOfYear = (today - startOfYear) / 86400000 + 1;
        fraction = Math.min(dayOfYear / daysInYear, 1.0);
    }

    // Find the budget year index in savingsData
    const yearIdx = savingsData ? savingsData.years.indexOf(budgetYear) : -1;

    // Build rows: { label, annualBudget, actual, type }
    const rows = [];

    // Savings rows
    const byCategory = budgetYearData.savings?.by_category || {};
    for (const [category, annualBudget] of Object.entries(byCategory)) {
        let actual = 0;
        if (savingsData && yearIdx !== -1) {
            const ds = savingsData.datasets.find(d => d.category === category);
            if (ds) actual = ds.data[yearIdx] || 0;
        }
        rows.push({ label: category, annualBudget, actual, type: 'savings' });
    }

    // Separator placeholder between savings and discretionary
    const hasSavings = rows.length > 0;

    // Discretionary rows
    const discItems = budgetYearData.spending?.sections?.discretionary?.items || {};
    for (const [label, item] of Object.entries(discItems)) {
        rows.push({ label, annualBudget: item.budget || 0, actual: item.spent || 0, type: 'discretionary' });
    }

    if (rows.length === 0) return;

    // For each row compute prorated target and segments
    const labels = [];
    const spentData = [];
    const remainingData = [];
    const overrunData = [];
    const spentColors = [];
    const remainingColors = [];
    const overrunColors = [];
    const separatorIdx = hasSavings ? (Object.keys(byCategory).length) : -1;

    rows.forEach((row, i) => {
        // Insert visual separator label between savings and discretionary
        if (hasSavings && i === separatorIdx && Object.keys(discItems).length > 0) {
            labels.push('');
            spentData.push(0);
            remainingData.push(0);
            overrunData.push(0);
            spentColors.push('transparent');
            remainingColors.push('transparent');
            overrunColors.push('transparent');
        }

        const proratedTarget = row.annualBudget * fraction;
        const spent = row.actual;

        labels.push(row.label);

        if (proratedTarget <= 0) {
            spentData.push(spent);
            remainingData.push(0);
            overrunData.push(0);
        } else if (spent <= proratedTarget) {
            spentData.push(spent);
            remainingData.push(proratedTarget - spent);
            overrunData.push(0);
        } else {
            spentData.push(proratedTarget);
            remainingData.push(0);
            overrunData.push(spent - proratedTarget);
        }

        const fillColor = row.type === 'savings' ? classified.accent : classified.chart3;
        const overrunColor = row.type === 'savings' ? classified.accent : classified.chartWarn;
        spentColors.push(fillColor);
        remainingColors.push(classified.backgroundAlt);
        overrunColors.push(overrunColor);
    });

    // Datalabels plugin: show % at end of each bar (after overrun if any)
    const datalabelsPlugin = {
        id: 'budgetProgressLabels',
        afterDraw(chart) {
            const { ctx: c, data } = chart;
            const meta0 = chart.getDatasetMeta(0);
            if (!meta0) return;
            c.save();
            c.font = `11px sans-serif`;
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'left';
            c.textBaseline = 'middle';

            meta0.data.forEach((bar, i) => {
                const proratedTarget = (spentData[i] || 0) + (remainingData[i] || 0) + (overrunData[i] || 0);
                const spent = (spentData[i] || 0) + (overrunData[i] || 0);
                if (proratedTarget <= 0) return;
                if (labels[i] === '') return;

                const pct = Math.round(spent / proratedTarget * 100);
                const totalWidth = (spentData[i] + remainingData[i] + overrunData[i]);

                // Find the rightmost dataset bar position
                let rightX = bar.x;
                for (let di = 0; di < chart.data.datasets.length; di++) {
                    const m = chart.getDatasetMeta(di);
                    if (m && m.data[i]) {
                        rightX = Math.max(rightX, m.data[i].x);
                    }
                }
                c.fillText(`${pct}%`, rightX + 4, bar.y);
            });
            c.restore();
        }
    };

    window.budgetProgressChart = new Chart(ctx, {
        type: 'bar',
        plugins: [datalabelsPlugin],
        data: {
            labels,
            datasets: [
                {
                    label: 'spent',
                    data: spentData,
                    backgroundColor: spentColors,
                    borderWidth: 0,
                },
                {
                    label: 'remaining to target',
                    data: remainingData,
                    backgroundColor: remainingColors,
                    borderWidth: 0,
                },
                {
                    label: 'overrun',
                    data: overrunData,
                    backgroundColor: overrunColors,
                    borderWidth: 0,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 40 } },
            scales: {
                x: {
                    stacked: true,
                    display: false,
                    grid: { display: false },
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        color: classified.text,
                        font: { size: 11 },
                    },
                    border: { display: false },
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title(items) {
                            return items[0]?.label || '';
                        },
                        label(item) {
                            const i = item.dataIndex;
                            if (labels[i] === '') return null;
                            const spent = spentData[i] + overrunData[i];
                            const annualBudget = (() => {
                                // Find original row by matching label
                                const ri = rows.findIndex(r => r.label === labels[i]);
                                return ri !== -1 ? rows[ri].annualBudget : 0;
                            })();
                            const proratedTarget = annualBudget * fraction;
                            return [
                                `spent: $${fmtK(spent)}k`,
                                `prorated target: $${fmtK(proratedTarget)}k`,
                                `annual budget: $${fmtK(annualBudget)}k`,
                            ];
                        },
                        filter(item) {
                            return item.datasetIndex === 0;
                        }
                    },
                    backgroundColor: classified.backgroundAlt,
                    titleColor: classified.text,
                    bodyColor: classified.textSubtle,
                }
            }
        }
    });
}
