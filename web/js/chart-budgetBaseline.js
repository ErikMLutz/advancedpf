// Budget Baseline Chart
// Horizontal grouped bar: budget (outline) vs actual (filled) per baseline line item

/**
 * @param {string} canvasId
 * @param {Object} baselineItems          - { [label]: { budget, spent, is_credit? } }
 * @param {number} totalDiscretionaryActual - sum of all discretionary item.spent values
 * @param {number} cashSpendingYTD        - YTD total from cash_spending.csv
 * @param {Object} classified
 * @param {string} budgetYear             - e.g. "2026"
 */
function createBudgetBaselineChart(canvasId, baselineItems, totalDiscretionaryActual, cashSpendingYTD, classified, budgetYear) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetBaselineChart && typeof window.budgetBaselineChart.destroy === 'function') {
        window.budgetBaselineChart.destroy();
    }

    // Day-of-year fraction for prorated reference line
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

    const entries = Object.entries(baselineItems);

    // Compute summary row values
    const totalSpentItems = entries.reduce((sum, [, item]) => sum + (item.spent || 0), 0);
    const totalActual = totalSpentItems + cashSpendingYTD;
    const baselineEstimate = totalActual - totalDiscretionaryActual;
    const baselineBudget = entries.reduce((sum, [, item]) => sum + (item.budget || 0), 0);

    // Build display labels and row data including separator + summary
    const labels = [];
    const budgetValues = [];
    const actualValues = [];
    const actualColors = [];
    const notTracked = []; // booleans: true if item has no tracked value

    entries.forEach(([label, item]) => {
        labels.push(label);
        budgetValues.push(item.budget || 0);

        const isTracked = item.is_credit === true || (item.spent !== undefined && item.spent > 0);
        notTracked.push(!isTracked);

        const spent = item.spent || 0;
        actualValues.push(isTracked ? spent : 0);
        const overrun = isTracked && spent > (item.budget || 0);
        actualColors.push(overrun ? classified.chartWarn : classified.chart2);
    });

    // Separator row
    labels.push('');
    budgetValues.push(0);
    actualValues.push(0);
    actualColors.push('transparent');
    notTracked.push(false);

    // Summary row
    labels.push('est. baseline total');
    budgetValues.push(baselineBudget);
    actualValues.push(baselineEstimate);
    const summaryOverrun = baselineEstimate > baselineBudget;
    actualColors.push(summaryOverrun ? classified.chartWarn : classified.chart2);
    notTracked.push(false);

    // Prorated reference line plugin
    const proratedLinePlugin = {
        id: 'budgetBaselineProratedLine',
        afterDraw(chart) {
            const { ctx: c, chartArea, scales } = chart;
            if (!scales.x) return;

            c.save();
            c.setLineDash([4, 4]);
            c.strokeStyle = classified.textSubtle;
            c.lineWidth = 1;
            c.globalAlpha = 0.6;

            labels.forEach((label, i) => {
                if (label === '') return;
                // Find the budget for this row to compute prorated value
                const budget = budgetValues[i];
                const proratedX = scales.x.getPixelForValue(budget * fraction);
                const meta = chart.getDatasetMeta(0);
                if (!meta.data[i]) return;
                const barY = meta.data[i].y;
                const halfHeight = meta.data[i].height / 2 + 2;
                c.beginPath();
                c.moveTo(proratedX, barY - halfHeight);
                c.lineTo(proratedX, barY + halfHeight);
                c.stroke();
            });

            c.restore();
        }
    };

    // "not tracked" label plugin
    const notTrackedPlugin = {
        id: 'budgetBaselineNotTracked',
        afterDraw(chart) {
            const { ctx: c, scales } = chart;
            if (!scales.x) return;
            c.save();
            c.font = `italic 10px sans-serif`;
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'left';
            c.textBaseline = 'middle';

            notTracked.forEach((isUntracked, i) => {
                if (!isUntracked) return;
                const meta = chart.getDatasetMeta(1); // actual bars dataset
                if (!meta.data[i]) return;
                const bar = meta.data[i];
                const zeroX = scales.x.getPixelForValue(0);
                c.fillText('not tracked', zeroX + 4, bar.y);
            });

            c.restore();
        }
    };

    window.budgetBaselineChart = new Chart(ctx, {
        type: 'bar',
        plugins: [proratedLinePlugin, notTrackedPlugin],
        data: {
            labels,
            datasets: [
                {
                    label: 'budget',
                    data: budgetValues,
                    backgroundColor: 'transparent',
                    borderColor: classified.backgroundAlt,
                    borderWidth: 2,
                    borderSkipped: false,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                },
                {
                    label: 'actual',
                    data: actualValues,
                    backgroundColor: actualColors,
                    borderWidth: 0,
                    barPercentage: 0.5,
                    categoryPercentage: 0.9,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 20 } },
            scales: {
                x: {
                    stacked: false,
                    display: false,
                    grid: { display: false },
                },
                y: {
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
                            const budget = budgetValues[i];
                            const actual = actualValues[i];
                            const proratedBudget = budget * fraction;
                            if (item.datasetIndex === 0) {
                                return [
                                    `budget: $${fmtK(budget)}k`,
                                    `prorated: $${fmtK(proratedBudget)}k`,
                                ];
                            }
                            return `actual: $${fmtK(actual)}k`;
                        },
                        filter(item) {
                            const i = item.dataIndex;
                            return labels[i] !== '';
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
