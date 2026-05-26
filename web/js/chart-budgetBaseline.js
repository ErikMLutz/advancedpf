// Budget Baseline Spending Chart
// Line chart: combined actual baseline (housing + other) vs straight-line target

/**
 * @param {string} canvasId
 * @param {number} housingBudget        - annual housing budget
 * @param {number} totalBudget          - total annual baseline budget
 * @param {number[]} creditByMonth      - 12-element array, abs credit spending per month
 * @param {number[]} cashByMonth        - 12-element array, abs cash spending per month
 * @param {number} discretionaryActual  - YTD total discretionary (spread evenly across months)
 * @param {Object} classified
 * @param {string} budgetYear           - e.g. "2026"
 */
function createBudgetBaselineChart(canvasId, housingBudget, totalBudget, creditByMonth, cashByMonth, discretionaryActual, classified, budgetYear) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetBaselineChart && typeof window.budgetBaselineChart.destroy === 'function') {
        window.budgetBaselineChart.destroy();
    }

    const budgetYearInt = parseInt(budgetYear);
    const today = new Date();
    const currentMonthIdx = today.getFullYear() > budgetYearInt ? 11
        : today.getFullYear() < budgetYearInt ? -1
        : today.getMonth();

    const monthLabels = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

    // Target: straight line $0 → totalBudget across 12 months
    const targetData = monthLabels.map((_, m) => Math.round(totalBudget / 12 * (m + 1)));

    // Actual: cumulative monthly — housing (even) + credit + cash − discretionary (prorated evenly)
    const actualData = [];
    const tooltipComponents = []; // { housing, credit, cash, disc } per month
    let cumCredit = 0;
    let cumCash = 0;
    for (let m = 0; m < 12; m++) {
        if (currentMonthIdx < 0 || m > currentMonthIdx) {
            actualData.push(null);
            tooltipComponents.push(null);
        } else {
            cumCredit += creditByMonth[m] || 0;
            cumCash += cashByMonth[m] || 0;
            const housingCum = Math.round(housingBudget / 12 * (m + 1));
            const discProrated = Math.round(discretionaryActual * (m + 1) / (currentMonthIdx + 1));
            actualData.push(housingCum + cumCredit + cumCash - discProrated);
            tooltipComponents.push({
                housing: housingCum,
                credit: Math.round(cumCredit),
                cash: Math.round(cumCash),
                disc: discProrated,
            });
        }
    }

    window.budgetBaselineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'target',
                    data: targetData,
                    borderColor: classified.textSubtle,
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                },
                {
                    label: 'actual',
                    data: actualData,
                    borderColor: classified.accent,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: classified.accent,
                    pointHitRadius: 8,
                    fill: false,
                    tension: 0,
                    spanGaps: false,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: classified.textSubtle, font: { size: 11 } },
                    border: { display: false },
                },
                y: {
                    grid: { color: classified.backgroundAlt },
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11 },
                        callback: v => '$' + fmtK(v) + 'k',
                    },
                    border: { display: false },
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: classified.textSubtle, font: { size: 11 }, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label(item) {
                            if (item.datasetIndex === 0) {
                                return `target: $${fmtK(item.parsed.y)}k`;
                            }
                            const c = tooltipComponents[item.dataIndex];
                            if (!c) return null;
                            return [
                                `credit: $${fmtK(c.credit)}k`,
                                `cash: $${fmtK(c.cash)}k`,
                                `housing: $${fmtK(c.housing)}k`,
                                `− discretionary: $${fmtK(c.disc)}k`,
                                `total: $${fmtK(item.parsed.y)}k`,
                            ];
                        }
                    }
                }
            }
        }
    });
}
