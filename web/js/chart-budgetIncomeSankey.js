// Budget Income Sankey Chart

/**
 * Create a Sankey diagram: income sources → gross income → savings/spending/unaccounted.
 * @param {string} canvasId
 * @param {Object} income   - { salary, bonus, RSU, LTC, ESPP, total }
 * @param {Object|null} savings  - { total, by_category }
 * @param {Object|null} spending - { total, sections: { baseline: { total, items }, ... } }
 * @param {Object|null} taxes   - { total, rate }
 * @param {Object} classified
 */
function createBudgetIncomeSankeyChart(canvasId, income, savings, spending, taxes, classified) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.budgetIncomeSankeyChart &&
        typeof window.budgetIncomeSankeyChart.destroy === 'function') {
        window.budgetIncomeSankeyChart.destroy();
    }

    const incomeSourceColors = {
        'salary': classified.chart1,
        'bonus':  classified.chart2,
        'rsu':    classified.chart3,
        'ltc':    classified.chart4,
        'espp':   classified.chart5,
    };
    const keyMap = { salary: 'salary', bonus: 'bonus', RSU: 'rsu', LTC: 'ltc', ESPP: 'espp' };

    const chartColors = [classified.chart1, classified.chart2, classified.chart3,
                         classified.chart4, classified.chart5];

    const flows = [];

    // ── Income sources → gross income ────────────────────────────────────
    Object.entries(keyMap)
        .filter(([k]) => (income[k] || 0) > 0)
        .forEach(([k, label]) => flows.push({
            from: label, to: 'gross income',
            flow: income[k], _color: incomeSourceColors[label]
        }));

    const savingsTotal  = savings?.totalGoal ?? savings?.total ?? 0;
    const spendingTotal = spending?.total || 0;
    const taxesTotal    = taxes?.total    || 0;
    const unaccounted   = income.total - savingsTotal - spendingTotal - taxesTotal;
    const isOverrun     = unaccounted < 0;

    // Flow order controls vertical node positions — top to bottom:
    // savings → taxes → spending → unaccounted
    // Within each branch, sub-flows are added immediately after their parent
    // so the library groups them without interleaving with other branches.

    // ── 1. Gross income → savings → buckets ──────────────────────────────
    if (savingsTotal > 0) {
        flows.push({
            from: 'gross income', to: 'savings',
            flow: Math.min(savingsTotal, income.total),
            _color: classified.accent
        });
        Object.entries(savings.by_category).forEach(([cat, val], i) => {
            const flow = val?.goal ?? val;
            if (!(flow > 0)) return;
            flows.push({ from: 'savings', to: cat, flow, _color: chartColors[i % 5] });
        });
    }

    // ── 2. Gross income → taxes ───────────────────────────────────────────
    if (taxesTotal > 0) {
        flows.push({
            from: 'gross income', to: 'taxes',
            flow: taxesTotal, _color: classified.chartAlarm
        });
    }

    // ── 3. Gross income → spending → section → items ─────────────────────
    if (spendingTotal > 0) {
        flows.push({
            from: 'gross income', to: 'spending',
            flow: spendingTotal,
            _color: classified.chartWarn
        });
        Object.entries(spending.sections).forEach(([sectionName, section], si) => {
            if (section.total <= 0) return;
            flows.push({
                from: 'spending', to: sectionName,
                flow: section.total, _color: classified.chartWarn
            });
            Object.entries(section.items).forEach(([label, item], ii) => {
                if (item.budget <= 0) return;
                flows.push({
                    from: sectionName, to: label,
                    flow: item.budget, _color: chartColors[(si * 3 + ii) % 5]
                });
            });
        });
    }

    // ── 4. Gross income → unaccounted ─────────────────────────────────────
    if (unaccounted > 0) {
        flows.push({
            from: 'gross income', to: 'unaccounted',
            flow: unaccounted, _color: classified.textSubtle
        });
    }

    // ── Overrun warning plugin ────────────────────────────────────────────
    const overrunPlugin = {
        id: 'overrunWarning',
        afterDraw(chart) {
            if (!isOverrun) return;
            const { ctx: c, width, height } = chart;
            const msg = `⚠ overrun: planned savings + spending exceeds income by $${fmtK(Math.abs(unaccounted), 1)}k`;
            c.save();
            c.font = '300 12px sans-serif';
            c.fillStyle = classified.chartAlarm;
            c.textAlign = 'center';
            c.fillText(msg, width / 2, height - 8);
            c.restore();
        }
    };

    window.budgetIncomeSankeyChart = new Chart(ctx, {
        type: 'sankey',
        plugins: [overrunPlugin],
        data: {
            datasets: [{
                data: flows,
                colorFrom: (c) => c.dataset.data[c.dataIndex]?._color || classified.chart1,
                colorTo: (c) => {
                    const d = c.dataset.data[c.dataIndex];
                    if (!d) return classified.chart1;
                    if (d.to === 'gross income' || d.to === 'savings') return classified.accent;
                    if (d.to === 'spending' || d.to in (spending?.sections || {})) return classified.chartWarn;
                    if (d.to === 'taxes') return classified.chartAlarm;
                    if (d.to === 'unaccounted') return classified.textSubtle;
                    return d._color || classified.chart1;
                },
                colorMode: 'gradient',
                alpha: 0.5,
                borderWidth: 0,
                nodeWidth: 12,
                nodePadding: 24,
                color: classified.text,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: classified.background,
                    titleColor: classified.text,
                    bodyColor: classified.text,
                    borderColor: classified.backgroundAlt,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title(items) {
                            const d = items[0]?.dataset.data[items[0].dataIndex];
                            return d ? `${d.from} → ${d.to}` : '';
                        },
                        label(context) {
                            const flow = context.dataset.data[context.dataIndex]?.flow ?? 0;
                            const pct = income.total > 0
                                ? (flow / income.total * 100).toFixed(1) + '%'
                                : '';
                            return '$' + fmtK(flow, 1) + 'k' + (pct ? '  (' + pct + ')' : '');
                        }
                    }
                }
            }
        }
    });
}
