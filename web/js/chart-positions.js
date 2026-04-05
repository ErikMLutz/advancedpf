// Positions Treemap Charts
// Two side-by-side treemaps: retirement positions and non-retirement positions.
// Sized by latest forward-filled value. Tooltips include expense ratio and dividend yield
// when position_info.json data is available.

/**
 * Create positions treemap charts
 * @param {string} allCanvasId - Canvas element ID for combined overall treemap
 * @param {string} retirementCanvasId - Canvas element ID for retirement treemap
 * @param {string} nonRetirementCanvasId - Canvas element ID for non-retirement treemap
 * @param {{ retirement: Array<{label, value}>, nonRetirement: Array<{label, value}> }} data
 * @param {Object} classified - Classified color scheme
 * @param {Object|null} positionInfo - Map of ticker → {name, expense_ratio, dividend_yield}
 */
function createPositionsChart(allCanvasId, retirementCanvasId, nonRetirementCanvasId, data, classified, positionInfo) {
    // Combine retirement + non-retirement, summing values for shared tickers
    const combined = new Map();
    [...data.retirement, ...data.nonRetirement].forEach(({ label, value }) => {
        combined.set(label, (combined.get(label) || 0) + value);
    });
    const allData = Array.from(combined.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    const chartColors = [
        classified.chart1,
        classified.chart2,
        classified.chart3,
        classified.chart4,
        classified.chart5
    ];

    // Returns white or black depending on which contrasts better against the given hex color
    function contrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // Perceived luminance (WCAG formula)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function makeChart(canvasId, treeData, instanceKey) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (window[instanceKey] && typeof window[instanceKey].destroy === 'function') {
            window[instanceKey].destroy();
        }

        if (!treeData || treeData.length === 0) return;

        const total = treeData.reduce((s, d) => s + d.value, 0);

        window[instanceKey] = new Chart(ctx, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: treeData,
                    key: 'value',
                    backgroundColor(ctx) {
                        if (ctx.type !== 'data') return 'transparent';
                        return chartColors[ctx.dataIndex % chartColors.length];
                    },
                    borderColor: classified.background,
                    borderWidth: 2,
                    labels: {
                        display: true,
                        color(ctx) {
                            if (ctx.type !== 'data') return classified.background;
                            const bg = chartColors[ctx.dataIndex % chartColors.length];
                            return contrastColor(bg);
                        },
                        font: { size: 11, weight: 500 },
                        formatter(ctx) {
                            if (ctx.type !== 'data') return '';
                            const item = treeData[ctx.dataIndex];
                            if (!item) return '';
                            const pct = total > 0 ? (item.value / total * 100).toFixed(0) : '0';
                            return [item.label, `${pct}%`];
                        }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: {
                        backgroundColor: classified.background,
                        titleColor: classified.text,
                        bodyColor: classified.text,
                        borderColor: classified.backgroundAlt,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            title(ctxArr) {
                                if (!ctxArr[0]) return '';
                                const item = treeData[ctxArr[0].dataIndex];
                                const info = positionInfo?.[item?.label];
                                return info?.name ? `${item.label} — ${info.name}` : (item?.label ?? '');
                            },
                            label(ctx) {
                                const item = treeData[ctx.dataIndex];
                                if (!item) return '';
                                const pct = total > 0 ? (item.value / total * 100).toFixed(1) : '0.0';
                                const lines = [`allocation: ${pct}%`];
                                const info = positionInfo?.[item.label];
                                if (info?.expense_ratio != null) {
                                    lines.push(`expense ratio: ${(info.expense_ratio * 100).toFixed(2)}%`);
                                }
                                if (info?.dividend_yield != null) {
                                    lines.push(`dividend yield: ${(info.dividend_yield * 100).toFixed(2)}%`);
                                }
                                return lines;
                            }
                        }
                    }
                }
            }
        });
    }

    makeChart(allCanvasId, allData, 'allPositionsChartInstance');
    makeChart(retirementCanvasId, data.retirement, 'retirementPositionsChartInstance');
    makeChart(nonRetirementCanvasId, data.nonRetirement, 'nonRetirementPositionsChartInstance');
}
