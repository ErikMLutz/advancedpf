// Savings Stacked Bar Chart

/**
 * Create savings stacked bar chart by category
 * @param {string} canvasId - Canvas element ID
 * @param {{ years: string[], datasets: Array<{category: string, data: number[]}> }} data
 * @param {Object} classified - Classified color scheme
 * @param {Array<number|null>} savingsRates - Savings rate per year (0-100), null if no income data
 * @param {Object|null} projectedSavings - { year, by_category, total } from budget config
 */
function createSavingsChart(canvasId, data, classified, savingsRates = [], projectedSavings = null) {
    const ctx = document.getElementById(canvasId);

    if (window.savingsChart && typeof window.savingsChart.destroy === 'function') {
        window.savingsChart.destroy();
    }

    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];

    const projectedIdx = projectedSavings
        ? data.years.indexOf(projectedSavings.year)
        : -1;

    // In the projected (budget) year, saved-so-far comes from the budget config's `value`
    // (savings.csv usually has nothing for that year yet). Use whichever is larger.
    // A category over its goal is split into the goal portion plus an "over" segment
    // stacked directly above it, so it reads as target + extra.
    const budgetEntry = (category) => projectedSavings?.by_category[category];
    const goalOf = (category) => {
        const e = budgetEntry(category);
        return e?.goal ?? (typeof e === 'number' ? e : 0);
    };
    const actualOf = (category, csvValue) => {
        const e = budgetEntry(category);
        return Math.max(csvValue || 0, (e && typeof e === 'object' ? e.value : 0) || 0);
    };

    const allCategories = [
        ...data.datasets.map(ds => ds.category),
        ...(projectedSavings ? Object.keys(projectedSavings.by_category) : []).filter(
            cat => !data.datasets.some(ds => ds.category === cat)
        )
    ];

    const datasets = allCategories.flatMap((category, i) => {
        const color = chartColors[i % chartColors.length];
        const ds = data.datasets.find(d => d.category === category);
        const values = ds ? ds.data : data.years.map(() => 0);
        const base = {
            label: category,
            data: values,
            backgroundColor: color,
            borderWidth: 0,
            stack: 'savings'
        };
        if (!projectedSavings || projectedIdx < 0) return [base];

        const planned = goalOf(category);
        const actual = actualOf(category, values[projectedIdx]);
        if (!ds && actual <= 0) return []; // budget-only category with nothing saved yet: planned bar only
        base.data = values.map((v, yi) => yi !== projectedIdx ? v : (planned > 0 ? Math.min(actual, planned) : actual));
        if (!(planned > 0) || actual <= planned) return [base];

        return [base, {
            label: category + ' (over)',
            data: data.years.map((_, yi) => yi === projectedIdx ? actual - planned : null),
            backgroundColor: classified.accentAlt,
            borderWidth: 0,
            stack: 'savings'
        }];
    });

    // Withdrawals as a separate negative bar below zero (only include if any are non-zero)
    if (data.withdrawals && data.withdrawals.some(v => v !== 0)) {
        datasets.push({
            label: 'withdrawals',
            data: data.withdrawals,
            backgroundColor: classified.chartWarn,
            borderWidth: 0,
            stack: 'savings'
        });
    }

    // Projected dashed bars: one dataset per category showing the remaining planned amount
    if (projectedSavings && projectedIdx >= 0) {
        allCategories.forEach((category, i) => {
            const planned = goalOf(category);
            const actualDs = data.datasets.find(ds => ds.category === category);
            const actual = actualOf(category, actualDs ? actualDs.data[projectedIdx] : 0);
            const remaining = Math.max(0, planned - actual);
            if (remaining <= 0) return;

            const color = chartColors[i % chartColors.length];
            const projData = data.years.map((_, yi) => yi === projectedIdx ? remaining : null);

            datasets.push({
                label: category + ' (planned)',
                data: projData,
                backgroundColor: color + '28', // ~16% opacity fill
                borderWidth: 0,
                stack: 'savings',
                _projected: true,
                _color: color
            });
        });
    }

    // Plugin: draw dashed borders over projected bars, rate label above each stack
    const combinedPlugin = {
        id: 'savingsPlugins',
        afterDatasetsDraw(chart) {
            const { ctx: c, scales } = chart;

            // Dashed borders for projected bars
            c.save();
            chart.data.datasets.forEach((dataset, dsIdx) => {
                if (!dataset._projected) return;
                const meta = chart.getDatasetMeta(dsIdx);
                meta.data.forEach((bar) => {
                    if (!bar || bar.base === bar.y) return;
                    const halfW = bar.width / 2;
                    c.strokeStyle = dataset._color;
                    c.lineWidth = 1.5;
                    c.setLineDash([5, 4]);
                    c.strokeRect(bar.x - halfW, bar.y, bar.width, bar.base - bar.y);
                    c.setLineDash([]);
                });
            });
            c.restore();

            // Savings rate labels above each positive stack
            c.save();
            c.font = '300 11px sans-serif';
            c.fillStyle = classified.textSubtle;
            c.textAlign = 'center';

            chart.data.labels.forEach((_, colIdx) => {
                const rate = savingsRates[colIdx];
                if (rate === null || rate === undefined) return;

                let total = 0;
                chart.data.datasets.forEach((ds, dsIdx) => {
                    if (!chart.getDatasetMeta(dsIdx).hidden) {
                        const val = ds.data[colIdx] || 0;
                        if (val > 0) total += val;
                    }
                });

                const x = scales.x.getPixelForValue(colIdx);
                const y = scales.y.getPixelForValue(total);
                c.fillText(rate + '%', x, y - 6);
            });

            c.restore();
        }
    };

    // Tooltip content. In the projected year show each category's total planned amount
    // (not what's left) plus any overage; other years show the plain stacked values.
    function tooltipLine(context) {
        const label = context.dataset.label;
        const value = context.parsed.y;
        const isProjectedCol = projectedSavings && context.dataIndex === projectedIdx;
        if (!isProjectedCol || label === 'withdrawals') {
            return value ? { text: label, value } : null;
        }
        if (label.endsWith(' (over)')) {
            return value ? { text: label.replace(' (over)', ' over target'), value } : null;
        }
        if (label.endsWith(' (planned)')) {
            const category = label.replace(' (planned)', '');
            // The solid dataset already reports the planned amount if the category has one
            const hasSolid = context.chart.data.datasets.some(d => d.label === category);
            return hasSolid ? null : { text: category + ' planned', value: goalOf(category) };
        }
        const planned = goalOf(label);
        if (planned > 0) return { text: label + ' planned', value: planned };
        return value ? { text: label, value } : null;
    }

    window.savingsChart = new Chart(ctx, {
        type: 'bar',
        plugins: [combinedPlugin],
        data: {
            labels: data.years,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 24 } },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        boxWidth: 12,
                        padding: 12,
                        // Hide projected/over datasets from legend — dashed bars and overage are self-explanatory
                        filter: (item) => !item.text.includes('(planned)') && !item.text.includes('(over)')
                    }
                },
                tooltip: {
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const line = tooltipLine(context);
                            return line ? `${line.text}: $${fmtK(line.value, 1)}k` : null;
                        },
                        footer: function(items) {
                            const total = items.reduce((sum, item) => sum + (tooltipLine(item)?.value || 0), 0);
                            return `total: $${fmtK(total, 1)}k`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 }
                    },
                    grid: { color: classified.backgroundAlt }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: classified.textSubtle,
                        font: { size: 11, weight: 300 },
                        callback: function(value) {
                            return '$' + fmtK(value, 0) + 'k';
                        }
                    },
                    grid: { color: classified.backgroundAlt }
                }
            }
        }
    });
}
