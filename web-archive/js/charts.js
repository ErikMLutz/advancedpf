// Finance Dashboard - Chart Implementations
// All 6 charts using Chart.js

/**
 * Chart 1: Monthly Movers - Bar chart of month-over-month changes
 * @param {string} canvasId - Canvas element ID
 * @param {Array} sources - All data sources
 * @param {string} colorscheme - Colorscheme name
 */
function createMonthlyMoversChart(canvasId, sources, colorscheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found - DOM may not be ready yet`);
        return null;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(`Element #${canvasId} is not a canvas element`);
        return null;
    }

    const movements = {};

    // Calculate changes for each source
    sources.forEach(source => {
        const changes = source.changeByMonth(1);
        if (changes.length > 0) {
            movements[source.sourceName] = changes[0].change;
        }
    });

    // Convert to array and sort by value
    const data = Object.entries(movements)
        .map(([label, change]) => ({ label, change }))
        .sort((a, b) => a.change - b.change);

    const colors = getColors(colorscheme, data.length);

    console.log(`Creating chart on #${canvasId} with ${data.length} data points`);

    try {
        const chart = new Chart(canvasId, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: 'Change',
                    data: data.map(d => d.change),
                    backgroundColor: colors
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Changes (This Month)'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: (value) => {
                                return new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });

        console.log(`Chart created successfully on #${canvasId}`);
        return chart;
    } catch (error) {
        console.error(`Error creating chart on #${canvasId}:`, error);
        return null;
    }
}

/**
 * Chart 2: 12-Month Net Worth - Current year vs last year
 * @param {string} canvasId - Canvas element ID
 * @param {Array} sources - Data sources
 * @param {string} colorscheme - Colorscheme name
 */
function create12MonthNetWorthChart(canvasId, sources, colorscheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found`);
        return null;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(`Element #${canvasId} is not a canvas element`);
        return null;
    }

    const data = computeValueOverLast12Months(sources);

    const months = data.map(d => d.month);
    const thisYearValues = data.map(d => d.value);
    const lastYearValues = data.map(d => d.last_year_value);

    const colors = getColorPalette(colorscheme);

    console.log(`Creating chart on #${canvasId}`);

    try {
        const chart = new Chart(canvasId, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                {
                    label: 'This Year',
                    data: thisYearValues,
                    backgroundColor: colors[0],
                    barPercentage: 0.9
                },
                {
                    label: 'Last Year',
                    data: lastYearValues,
                    backgroundColor: colors[1],
                    barPercentage: 0.5
                }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Net Worth (Last 12 Months)'
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: function(value, index) {
                                // Show every other month
                                return index % 2 === 0 ? this.getLabelForValue(value) : '';
                            }
                        }
                    },
                    y: {
                        ticks: {
                            callback: (value) => `$${(value / 1000).toFixed(0)}k`
                        }
                    }
                }
            }
        }); // Close Chart constructor

        console.log(`Chart created successfully on #${canvasId}`);
        return chart;
    } catch (error) {
        console.error(`Error creating chart on #${canvasId}:`, error);
        return null;
    }
}

/**
 * Chart 3: Stats Panel - Text-based statistics
 * @param {string} elementId - Container element ID
 * @param {Array} sources - All sources
 * @param {Array} assets - Asset sources
 * @param {Array} liabilities - Liability sources
 * @param {Array} credit - Credit sources
 */
function createStatsPanel(elementId, sources, assets, liabilities, credit) {
    const data = computeValueOverLast12Months(sources);
    const netWorth = data[data.length - 1].value;
    const netWorthLastMonth = data[data.length - 2].value;
    const netWorthLastYear = data[data.length - 1].last_year_value;

    const assetsData = computeValueOverLast12Months(assets);
    const totalAssets = assetsData[assetsData.length - 1].value;

    const liabilitiesData = computeValueOverLast12Months(liabilities);
    const totalLiabilities = liabilitiesData[liabilitiesData.length - 1].value;

    const creditData = computeValueOverLast12Months(credit);
    const creditThisYear = creditData.reduce((sum, d) => sum + d.value, 0);
    const creditLastYear = creditData.reduce((sum, d) => sum + d.last_year_value, 0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(value);
    };

    const html = `
        <h3>Stats</h3>
        <div class="stat-group">
            <div><span class="stat-label">Net Worth:</span> <span class="stat-value">${formatCurrency(netWorth)}</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">Assets:</span> <span class="stat-value">${formatCurrency(totalAssets)}</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">Liabilities:</span> <span class="stat-value">${formatCurrency(totalLiabilities)}</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">1 Month Change:</span> <span class="stat-value ${netWorth - netWorthLastMonth >= 0 ? 'stat-positive' : 'stat-negative'}">${formatCurrency(netWorth - netWorthLastMonth)}</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">1 Year Change:</span> <span class="stat-value ${netWorth - netWorthLastYear >= 0 ? 'stat-positive' : 'stat-negative'}">${formatCurrency(netWorth - netWorthLastYear)}</span></div>
        </div>
        <div class="stat-group" style="margin-top: 15px;">
            <div><span class="stat-label">Credit Card Spend:</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">Last 12 Months:</span> <span class="stat-value">${formatCurrency(-1 * creditThisYear)}</span></div>
            <div style="margin-left: 20px;"><span class="stat-label">Previous 12 Months:</span> <span class="stat-value">${formatCurrency(-1 * creditLastYear)}</span></div>
        </div>
    `;

    document.getElementById(elementId).innerHTML = html;
}

/**
 * Chart 4: Credit Card Spending - Bars + rolling average lines
 * @param {string} canvasId - Canvas element ID
 * @param {EventData} credit - Credit data source
 * @param {string} colorscheme - Colorscheme name
 */
function createSpendingChart(canvasId, credit, colorscheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found`);
        return null;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(`Element #${canvasId} is not a canvas element`);
        return null;
    }

    const data = computeValueOverLast12Months([credit]);

    const months = data.map(d => d.month);
    const thisYearValues = data.map(d => -1 * d.value);
    const thisYearMovingAvg = data.map(d => d.value_6_month_rolling_average ? -1 * d.value_6_month_rolling_average : null);
    const lastYearMovingAvg = data.map(d => d.last_year_value_6_month_rolling_average ? -1 * d.last_year_value_6_month_rolling_average : null);

    const colors = getColorPalette(colorscheme);

    console.log(`Creating chart on #${canvasId}`);

    try {
        const chart = new Chart(canvasId, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Spend',
                    data: thisYearValues,
                    backgroundColor: colors[0],
                    type: 'bar'
                },
                {
                    label: 'This Year (6mo avg)',
                    data: thisYearMovingAvg,
                    borderColor: colors[3],
                    backgroundColor: colors[3],
                    type: 'line',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Last Year (6mo avg)',
                    data: lastYearMovingAvg,
                    borderColor: colors[4],
                    backgroundColor: colors[4],
                    type: 'line',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Credit Card Spending (Last 12 Months)'
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value, index) {
                            return index % 2 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    ticks: {
                        callback: (value) => `$${(value / 1000).toFixed(0)}k`
                    }
                }
            }
        }
    });

        console.log(`Chart created successfully on #${canvasId}`);
        return chart;
    } catch (error) {
        console.error(`Error creating chart on #${canvasId}:`, error);
        return null;
    }
}

/**
 * Chart 5: All-Time Net Worth - Line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} sources - Data sources
 * @param {string} colorscheme - Colorscheme name
 */
function createAllTimeNetWorthChart(canvasId, sources, colorscheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found`);
        return null;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(`Element #${canvasId} is not a canvas element`);
        return null;
    }

    // Calculate months from 2013-09 to now
    const startDate = new Date('2013-09-01');
    const today = new Date();
    const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 +
                       (today.getMonth() - startDate.getMonth());

    // Get all data
    const allData = [];
    for (let i = 0; i <= monthsDiff; i++) {
        const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const month = formatMonth(date);
        let value = 0;

        // Sum all sources for this month
        sources.forEach(source => {
            const monthData = source.valueByMonth(monthsDiff + 1);
            const dataPoint = monthData.find(d => d.month === month);
            if (dataPoint) {
                value += dataPoint.value;
            }
        });

        allData.push({ month, value });
    }

    const months = allData.map(d => d.month);
    const values = allData.map(d => d.value);

    const colors = getColorPalette(colorscheme);

    console.log(`Creating chart on #${canvasId}`);

    try {
        const chart = new Chart(canvasId, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Net Worth',
                data: values,
                borderColor: colors[0],
                backgroundColor: colors[0],
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Net Worth (All Time)'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            // Show every other January
                            if (label.endsWith('-01')) {
                                const year = label.substring(0, 4);
                                if (parseInt(year) % 2 === 1) {
                                    return year;
                                }
                            }
                            return '';
                        }
                    }
                },
                y: {
                    ticks: {
                        callback: (value) => `$${(value / 1000).toFixed(0)}k`
                    }
                }
            }
        }
    });

        console.log(`Chart created successfully on #${canvasId}`);
        return chart;
    } catch (error) {
        console.error(`Error creating chart on #${canvasId}:`, error);
        return null;
    }
}

/**
 * Chart 6: Asset Categorization - Stacked horizontal bar
 * @param {string} canvasId - Canvas element ID
 * @param {Array} sources - Data sources
 * @param {Array} manifest - Manifest data
 * @param {string} colorscheme - Colorscheme name
 */
function createAssetCategorizationChart(canvasId, sources, manifest, colorscheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas #${canvasId} not found`);
        return null;
    }
    if (!(canvas instanceof HTMLCanvasElement)) {
        console.error(`Element #${canvasId} is not a canvas element`);
        return null;
    }

    // Get current values by account
    let assets = [];
    sources.forEach(source => {
        const accountValues = source.valueByAccount();
        assets = assets.concat(accountValues);
    });

    // Merge with manifest data
    const assetsWithMetadata = assets.map(asset => {
        const meta = manifest.find(m => m.account === asset.account);
        return {
            ...asset,
            type: meta?.type || 'unknown',
            retirement: meta?.retirement || false,
            debt_applies_to: meta?.debt_applies_to || '',
            primary_residence: meta?.primary_residence || false
        };
    });

    // Apply debt to assets
    assetsWithMetadata.forEach(asset => {
        const applicableDebt = assetsWithMetadata
            .filter(a => a.type === 'debt' && a.debt_applies_to === asset.account)
            .reduce((sum, a) => sum + a.value, 0);
        asset.value += applicableDebt;
    });

    // Remove debt type
    const assetsOnly = assetsWithMetadata.filter(a => a.type !== 'debt');

    // Categorize
    const categorized = assetsOnly.map(asset => {
        let category = asset.type;

        if (asset.retirement) {
            category = `retirement ${category}`;
        }

        if (asset.primary_residence) {
            category = 'primary residence';
        }

        return { ...asset, category };
    });

    // Group by category
    const categoryGroups = {};
    categorized.forEach(asset => {
        if (!categoryGroups[asset.category]) {
            categoryGroups[asset.category] = 0;
        }
        categoryGroups[asset.category] += asset.value;
    });

    // Convert to array and sort
    const categoryData = Object.entries(categoryGroups)
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value);

    const total = categoryData.reduce((sum, d) => sum + d.value, 0);

    // Add proportions
    categoryData.forEach(d => {
        d.proportion = d.value / total;
    });

    const colors = getColors(colorscheme, categoryData.length);

    console.log(`Creating chart on #${canvasId}`);

    try {
        const chart = new Chart(canvasId, {
        type: 'bar',
        data: {
            labels: ['Assets'],
            datasets: categoryData.map((d, i) => ({
                label: d.category,
                data: [d.value],
                backgroundColor: colors[i],
                borderWidth: 0
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Net Asset Categorization'
                },
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = categoryData[context.datasetIndex];
                            const value = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0
                            }).format(item.value);
                            const pct = (item.proportion * 100).toFixed(0);
                            return `${item.category}: ${value} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        callback: (value) => `$${(value / 1000).toFixed(0)}k`
                    }
                },
                y: {
                    stacked: true,
                    display: false
                }
            }
        }
    });

        console.log(`Chart created successfully on #${canvasId}`);
        return chart;
    } catch (error) {
        console.error(`Error creating chart on #${canvasId}:`, error);
        return null;
    }
}
