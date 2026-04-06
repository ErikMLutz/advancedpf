// Positions Treemap Charts
// Single full-width treemap with a toggle (overall / retirement / non-retirement / underlying / sectors / all).
// "all" mode renders five charts for print: overall, retirement, non-retirement, underlying, sectors.

/**
 * Create positions treemap chart(s)
 * @param {{ retirement: Array<{label, value}>, nonRetirement: Array<{label, value}> }} data
 * @param {Object} classified - Classified color scheme
 * @param {Object|null} positionInfo - Map of ticker → {name, expense_ratio, dividend_yield}
 * @param {Array<{label, value}>|null} underlyingData - Pre-computed underlying holdings
 * @param {Array<{label, value}>|null} sectorData - Pre-computed sector breakdown
 * @param {'overall'|'retirement'|'non-retirement'|'underlying'|'sectors'|'all'} view
 */
function createPositionsChart(data, classified, positionInfo, underlyingData, sectorData, view) {
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

    function contrastColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function makeChart(canvasId, treeData, instanceKey, tooltipExtra) {
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
                            const item = ctx.raw?._data;
                            const value = ctx.raw?.v;
                            if (!item || value == null) return '';
                            const pct = total > 0 ? (value / total * 100).toFixed(0) : '0';
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
                                const label = ctxArr[0].raw?._data?.label ?? '';
                                const info = positionInfo?.[label];
                                return info?.name ? `${label} — ${info.name}` : label;
                            },
                            label(ctx) {
                                const label = ctx.raw?._data?.label;
                                const value = ctx.raw?.v;
                                if (value == null) return '';
                                const pct = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
                                const lines = [`allocation: ${pct}%`];
                                const info = positionInfo?.[label];
                                if (info?.expense_ratio != null) {
                                    lines.push(`expense ratio: ${(info.expense_ratio * 100).toFixed(2)}%`);
                                }
                                if (info?.dividend_yield != null) {
                                    lines.push(`dividend yield: ${(info.dividend_yield * 100).toFixed(2)}%`);
                                }
                                if (tooltipExtra) {
                                    const extra = tooltipExtra(label);
                                    if (extra) lines.push(extra);
                                }
                                return lines;
                            }
                        }
                    }
                }
            }
        });
    }

    function destroyChart(instanceKey) {
        if (window[instanceKey] && typeof window[instanceKey].destroy === 'function') {
            window[instanceKey].destroy();
            window[instanceKey] = null;
        }
    }

    if (view === 'all') {
        destroyChart('positionsSingleChartInstance');
        makeChart('allPositionsChart', allData, 'allPositionsChartInstance');
        makeChart('retirementPositionsChart', data.retirement, 'retirementPositionsChartInstance');
        makeChart('nonRetirementPositionsChart', data.nonRetirement, 'nonRetirementPositionsChartInstance');
        makeChart('positionsUnderlyingPrintChart', underlyingData, 'positionsUnderlyingPrintChartInstance');
        makeChart('positionsSectorsPrintChart', sectorData, 'positionsSectorsPrintChartInstance');
    } else {
        destroyChart('allPositionsChartInstance');
        destroyChart('retirementPositionsChartInstance');
        destroyChart('nonRetirementPositionsChartInstance');
        destroyChart('positionsUnderlyingPrintChartInstance');
        destroyChart('positionsSectorsPrintChartInstance');

        const treeData =
            view === 'retirement'     ? data.retirement :
            view === 'non-retirement' ? data.nonRetirement :
            view === 'underlying'     ? underlyingData :
            view === 'sectors'        ? sectorData :
            allData; // 'overall'

        makeChart('positionsSingleChart', treeData, 'positionsSingleChartInstance');
    }
}
