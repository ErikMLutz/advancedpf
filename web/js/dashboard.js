document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => {
        // themes.js pre-loads the default theme synchronously, so getTheme() works here
        // before the async initThemes() call in init() has resolved.
        const DEFAULT_SCHEME = 'pacificMist_dark';
        const _initial = getTheme(DEFAULT_SCHEME);
        return {
        currentScheme: DEFAULT_SCHEME,
        backgroundColor: _initial.classified.background,
        textColor: _initial.classified.text,
        theme: {
            name: _initial.name,
            colors: _initial.colors,
            classified: { ..._initial.classified }
        },
        settingsOpen: false,
        printMode: false,
        loading: true,
        loadingProgress: 0,
        netWorthData: null,
        netWorthProjectionEnabled: false,
        netWorth12MonthsData: null,
        assetAllocationData: null,
        netWorthGrowthData: null,
        netWorthGrowthSince: 2016,
        portfolioPerformanceSince: 2022,
        savingsSince: 2022,
        portfolioPerformanceData: null,
        indexReturnsData: null,
        incomeData: null,
        creditSpendingData: null,
        creditByYearData: null,
        savingsData: null,
        retirementTaxData: null,
        retirementGrowthData: null,
        positionsData: null,
        positionInfoData: null,
        positionHoldingsData: null,
        positionSectorsData: null,
        underlyingPositionsData: null,
        sectorPositionsData: null,
        positionsView: 'overall',
        accountsData: null,
        budgetData: null,
        cashSpendingData: null,
        rawData: null,
        dataLoadError: null,
        allThemes: {},
        themeMapping: {},
        themePalette: {},
        newColorName: '',
        newColorHex: '#808080',
        newColorNameError: '',
        themeCopied: false,
        themeApplied: false,

        get hasError() {
            return this.dataLoadError !== null && this.dataLoadError !== undefined && this.dataLoadError !== '';
        },

        async init() {
            this.loading = true;
            this.loadingProgress = 0;

            await initThemes();
            this.allThemes = getAllThemes();
            this.loadTheme();

            // Keep --theme-bg in sync for the @media print html/body background rule,
            // which fills the page canvas below the last content element.
            const syncBgColor = (val) => {
                document.documentElement.style.setProperty('--theme-bg', val);
            };
            syncBgColor(this.backgroundColor);
            this.$watch('backgroundColor', syncBgColor);

            await this.loadData();
            this.renderCharts();

            this.loadingProgress = 100;
            await new Promise(resolve => setTimeout(resolve, 200));
            this.loading = false;
        },

        loadTheme() {
            // Mutate in-place rather than replacing this.theme entirely.
            // Replacing the reactive object causes Alpine to temporarily strip all
            // inline styles (including the loading overlay's display:none) while
            // it re-creates the reactive proxy — which briefly shows the loading screen.
            const newTheme = getTheme(this.currentScheme);
            this.theme.classified = newTheme.classified;
            this.theme.name = newTheme.name;
            this.theme.colors = newTheme.colors;
            this.backgroundColor = newTheme.classified.background;
            this.textColor = newTheme.classified.text;

            // Initialize theme mapping and palette for editing
            // Palette must be set before mapping: Alpine re-renders between assignments,
            // and the mapping editor template looks up getThemePalette()[family]. If mapping
            // is updated first with new family names while palette still has old families,
            // every swatch expression crashes with "undefined is not an object".
            const themeObj = THEMES[this.currentScheme];
            this.themePalette = JSON.parse(JSON.stringify(themeObj.palette));
            this.themeMapping = { ...themeObj.mapping };
            this.newColorName = '';
            this.newColorHex = '#808080';
            this.newColorNameError = '';
        },

        async loadData() {
            try {
                // Load all CSV files
                const rawData = await loadAllData();
                this.rawData = rawData;

                // Create data source objects (matching main.py structure)
                const cash = new SnapshotData('cash', rawData.cash);
                const property = new SnapshotData('property', rawData.property);
                const debt = new SnapshotData('debt', rawData.debt);
                const securities = new SnapshotData('securities', rawData.securities);
                const credit = new EventData('credit', rawData.credit);

                // Combine sources (exclude credit from net worth)
                const sources = [cash, property, debt, securities];

                // Find the actual date range from the data
                const allDates = [
                    ...rawData.cash.map(d => d.date),
                    ...rawData.property.map(d => d.date),
                    ...rawData.debt.map(d => d.date),
                    ...rawData.securities.map(d => d.date)
                ];

                if (allDates.length === 0) {
                    throw new Error('No data found in CSV files');
                }

                const minDate = new Date(Math.min(...allDates));
                const maxDate = new Date(Math.max(...allDates));

                // Calculate months between min and max
                const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                                  (maxDate.getMonth() - minDate.getMonth()) + 1;

                // Get data for all months in the actual range
                const monthSkeleton = createMonthSkeleton(monthsDiff);
                const monthValues = monthSkeleton.map(month => {
                    let total = 0;
                    sources.forEach(source => {
                        const monthData = source.valueByMonth(monthsDiff);
                        const dataPoint = monthData.find(d => d.month === month);
                        if (dataPoint) {
                            total += dataPoint.value;
                        }
                    });
                    return { month, value: total };
                });

                // Filter to remove leading and trailing zeros, but keep zeros in the middle
                // Find first and last non-zero values
                const firstNonZeroIndex = monthValues.findIndex(d => d.value !== 0);
                const lastNonZeroIndex = monthValues.map(d => d.value !== 0).lastIndexOf(true);

                if (firstNonZeroIndex === -1) {
                    throw new Error('No non-zero data found');
                }

                // Keep data from first to last non-zero value (inclusive)
                const filteredData = monthValues.slice(firstNonZeroIndex, lastNonZeroIndex + 1);

                // Compute categorized breakdowns for verbose mode
                // Get all account-level data with categorization
                const accountsWithMetadata = getAccountsWithMetadata(sources, rawData.manifest, false, monthsDiff);

                // Group by month and category
                const categoryBreakdowns = {};
                filteredData.forEach(monthData => {
                    const month = monthData.month;
                    const breakdown = {};

                    // Get all accounts for this month
                    const monthAccounts = accountsWithMetadata.filter(a => a.month === month);

                    // Sum by category
                    monthAccounts.forEach(account => {
                        if (!breakdown[account.category]) {
                            breakdown[account.category] = 0;
                        }
                        breakdown[account.category] += account.value;
                    });

                    categoryBreakdowns[month] = breakdown;
                });

                const nwMonths = filteredData.map(d => d.month);
                const nwValues = filteredData.map(d => d.value);

                // Compute 2-year projection from last 12 months growth rate
                let projection = null;
                if (nwMonths.length >= 13) {
                    const lastValue = nwValues[nwValues.length - 1];
                    const value12moAgo = nwValues[nwValues.length - 13];
                    if (value12moAgo > 0) {
                        const annualRate = lastValue / value12moAgo - 1;
                        const monthlyFactor = Math.pow(1 + annualRate, 1 / 12);
                        const lastMonth = nwMonths[nwMonths.length - 1];
                        const [lastYear, lastMon] = lastMonth.split('-').map(Number);
                        const projMonths = [];
                        const projValues = [];
                        // Start with the last real point so the line connects
                        projMonths.push(lastMonth);
                        projValues.push(lastValue);
                        for (let i = 1; i <= 24; i++) {
                            const d = new Date(lastYear, lastMon - 1 + i, 1);
                            projMonths.push(formatMonth(d));
                            projValues.push(lastValue * Math.pow(monthlyFactor, i));
                        }
                        projection = { months: projMonths, values: projValues, annualRate };
                    }
                }

                this.netWorthData = {
                    months: nwMonths,
                    values: nwValues,
                    categoryBreakdowns: categoryBreakdowns,
                    projection
                };

                // Compute YoY net worth growth % by month
                const monthValueMap = {};
                filteredData.forEach(d => { monthValueMap[d.month] = d.value; });
                this.netWorthGrowthData = filteredData
                    .map(d => {
                        const [year, mon] = d.month.split('-');
                        const prevMonth = `${parseInt(year) - 1}-${mon}`;
                        if (!(prevMonth in monthValueMap)) return null;
                        const prevValue = monthValueMap[prevMonth];
                        if (prevValue === 0) return null;
                        return { month: d.month, growth: (d.value - prevValue) / prevValue * 100 };
                    })
                    .filter(d => d !== null);

                // Calculate 12-month net worth with year-over-year comparison
                this.netWorth12MonthsData = computeValueOverLast12Months(sources);

                // Calculate asset allocation
                this.assetAllocationData = computeAssetAllocation(sources, rawData.manifest);

                // Process income data (already in year/value format, just sort by year)
                // Schema: year, total_income, federal_income_tax, state_income_tax
                const sortedIncome = [...rawData.income].sort((a, b) => a.year - b.year);
                this.incomeData = {
                    years: sortedIncome.map(d => String(d.year)),
                    values: sortedIncome.map(d => d.total_income),
                    federalTax: sortedIncome.map(d => d.federal_income_tax),
                    stateTax: sortedIncome.map(d => d.state_income_tax),
                    socialSecurity: sortedIncome.map(d => d.social_security),
                    medicare: sortedIncome.map(d => d.medicare)
                };

                // Credit card spending: last 12 months with trailing averages
                this.creditSpendingData = computeValueOverLast12Months([credit]);

                // Credit card spending summed by calendar year (negative values = spending)
                const creditByYear = {};
                rawData.credit.forEach(row => {
                    const year = String(row.date.getFullYear());
                    creditByYear[year] = (creditByYear[year] || 0) + row.value;
                });
                this.creditByYearData = creditByYear;

                // Cash spending (checks, Venmo, etc.) as EventData for budget baseline chart
                this.cashSpendingData = new EventData('cashSpending', rawData.cashSpending);

                // Savings by year and category
                this.savingsData = computeSavingsAllocation(rawData.savings, rawData.manifest);

                // Portfolio performance by category (estimated yearly rate of return)
                this.portfolioPerformanceData = computePortfolioPerformance(sources, rawData.manifest, rawData.savings);

                // S&P 500 monthly YoY data (pre-generated by scripts/fetch-index-returns.py)
                try {
                    const resp = await fetch('data/sp500_returns.json');
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    this.indexReturnsData = await resp.json();
                } catch (e) {
                    console.warn('Could not load S&P 500 index data:', e);
                    this.indexReturnsData = null;
                }

                // Retirement accounts by tax treatment
                this.retirementTaxData = computeRetirementTaxAllocation(sources, rawData.manifest);

                // Retirement growth: cumulative contributions vs total balance
                this.retirementGrowthData = computeRetirementGrowth(sources, rawData.manifest, rawData.savings);

                // Positions treemap (latest forward-filled values, split by retirement)
                this.positionsData = computePositionsData(rawData.positions, rawData.manifest);

                // Position info (pre-generated by scripts/fetch-position-info.py)
                try {
                    const resp = await fetch('data/position_info.json');
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    this.positionInfoData = await resp.json();
                } catch (e) {
                    console.warn('Could not load position info data:', e);
                    this.positionInfoData = null;
                }

                // Position holdings + sectors (pre-generated by scripts/fetch-position-holdings.py)
                try {
                    const [hResp, sResp] = await Promise.all([
                        fetch('data/position_holdings.json'),
                        fetch('data/position_sectors.json'),
                    ]);
                    this.positionHoldingsData = hResp.ok ? await hResp.json() : null;
                    this.positionSectorsData = sResp.ok ? await sResp.json() : null;
                } catch (e) {
                    console.warn('Could not load position holdings/sectors data:', e);
                    this.positionHoldingsData = null;
                    this.positionSectorsData = null;
                }

                if (this.positionsData) {
                    this.underlyingPositionsData = computeUnderlyingPositions(
                        this.positionsData, this.positionHoldingsData
                    );
                    this.sectorPositionsData = computeSectorPositions(
                        this.positionsData, this.positionSectorsData
                    );
                }

                // Accounts table (current balances, split by retirement)
                this.accountsData = computeAccountsTable(sources, rawData.manifest, rawData.positions);

                // Budget: load yaml config (savings etc.) + pre-computed json (stock-price-dependent income)
                try {
                    const [configResp, dataResp] = await Promise.allSettled([
                        fetch(`${CONFIG.dataPaths.budgetConfig}?t=${Date.now()}`),
                        fetch(`${CONFIG.dataPaths.budgetData}?t=${Date.now()}`)
                    ]);

                    const budgetConfig = (configResp.status === 'fulfilled' && configResp.value.ok)
                        ? jsyaml.load(await configResp.value.text())
                        : null;
                    const budgetJson = (dataResp.status === 'fulfilled' && dataResp.value.ok)
                        ? await dataResp.value.json()
                        : null;

                    if (budgetConfig || budgetJson) {
                        const allYears = new Set([
                            ...Object.keys(budgetJson || {}),
                            ...Object.keys((budgetConfig?.budgets) || {})
                        ]);
                        this.budgetData = {};
                        for (const year of allYears) {
                            const savingsEntries = budgetConfig?.budgets?.[year]?.savings;
                            this.budgetData[year] = {
                                income: budgetJson?.[year]?.income || null,
                                savings: savingsEntries
                                    ? computeBudgetSavings(savingsEntries)
                                    : null,
                                spending: computeBudgetSpending(budgetConfig?.budgets?.[year]?.spending),
                                taxes: computeBudgetTaxes(
                                    budgetConfig?.budgets?.[year]?.taxes,
                                    budgetJson?.[year]?.income?.total || 0
                                )
                            };

                            // For projected years (not yet in incomeData), compute YTD actuals
                            // needed by the baseline chart.
                            if (!this.incomeData.years.includes(year)) {
                                // Sum credit spending for this calendar year
                                const creditMonthly = credit.valueByMonth(48);
                                const creditYTD = creditMonthly
                                    .filter(d => d.month.startsWith(year))
                                    .reduce((sum, d) => sum + Math.abs(d.value), 0);

                                // Sum cash spending for this calendar year
                                const cashSpendingYTD = computeCashSpendingYTD(rawData.cashSpending, year);

                                this.budgetData[year].creditYTD = creditYTD;
                                this.budgetData[year].cashSpendingYTD = cashSpendingYTD;

                                // Substitute real credit YTD into the is_credit baseline item
                                const baselineItems = this.budgetData[year].spending?.sections?.baseline?.items;
                                if (baselineItems) {
                                    for (const item of Object.values(baselineItems)) {
                                        if (item.is_credit === true) {
                                            item.spent = creditYTD;
                                        }
                                    }
                                    // Also update the section's spent total to reflect substitution
                                    const baselineSection = this.budgetData[year].spending.sections.baseline;
                                    baselineSection.spent = Object.values(baselineItems)
                                        .reduce((sum, item) => sum + item.spent, 0);
                                }
                            }
                        }
                    } else {
                        this.budgetData = null;
                    }
                } catch (e) {
                    console.warn('Could not load budget data:', e);
                    this.budgetData = null;
                }

                this.dataLoadError = null;

            } catch (error) {
                console.error('Failed to load data:', error);
                this.dataLoadError = error.message;
                this.netWorthData = null;
            }
        },

        renderCharts() {
            try {
                // Only render if data loaded successfully
                if (this.netWorthData && this.dataLoadError === null) {
                    createAllTimeNetWorthChart(
                        'netWorthChart',
                        this.netWorthData,
                        this.theme.classified,
                        this.netWorthData.categoryBreakdowns,
                        this.netWorthProjectionEnabled ? this.netWorthData.projection : null
                    );
                }

                if (this.netWorth12MonthsData && this.dataLoadError === null) {
                    create12MonthNetWorthChart(
                        'netWorth12MonthsChart',
                        this.netWorth12MonthsData,
                        this.theme.classified
                    );
                }

                if (this.assetAllocationData && this.dataLoadError === null) {
                    createAssetAllocationChart(
                        'assetAllocationChart',
                        this.assetAllocationData,
                        this.theme.classified,
                        this.printMode
                    );
                }

                if (this.incomeData && this.dataLoadError === null) {
                    let projectedIncome = null;
                    if (this.budgetData) {
                        const latestBudgetYear = Object.keys(this.budgetData).sort().pop();
                        if (latestBudgetYear && !this.incomeData.years.includes(latestBudgetYear)) {
                            projectedIncome = {
                                year: latestBudgetYear,
                                value: this.budgetData[latestBudgetYear]?.income?.total || 0
                            };
                        }
                    }
                    createIncomeChart(
                        'incomeChart',
                        this.incomeData,
                        this.theme.classified,
                        projectedIncome
                    );
                }

                if (this.creditSpendingData && this.dataLoadError === null) {
                    createCreditSpendingChart(
                        'creditSpendingChart',
                        this.creditSpendingData,
                        this.theme.classified
                    );
                }

                if (this.incomeData && this.dataLoadError === null) {
                    const effectiveRates = this.incomeData.years.map((_, i) => {
                        const income = this.incomeData.values[i];
                        if (!income) return null;
                        const totalTax = (this.incomeData.federalTax[i] || 0)
                            + (this.incomeData.stateTax[i] || 0)
                            + (this.incomeData.socialSecurity[i] || 0)
                            + (this.incomeData.medicare[i] || 0);
                        return Math.round(totalTax / income * 100);
                    });

                    let projectedTax = null;
                    if (this.budgetData) {
                        const latestBudgetYear = Object.keys(this.budgetData).sort().pop();
                        const yearData = this.budgetData[latestBudgetYear];
                        if (latestBudgetYear && !this.incomeData.years.includes(latestBudgetYear) && yearData?.taxes?.total) {
                            projectedTax = {
                                year: latestBudgetYear,
                                total: yearData.taxes.total,
                                rate: yearData.taxes.rate
                            };
                        }
                    }

                    createTaxesChart(
                        'taxesChart',
                        this.incomeData,
                        this.theme.classified,
                        effectiveRates,
                        projectedTax
                    );
                }

                if (this.retirementTaxData && this.retirementTaxData.length > 0 && this.dataLoadError === null) {
                    createRetirementTaxAllocationChart(
                        'retirementTaxAllocationChart',
                        this.retirementTaxData,
                        this.theme.classified
                    );
                }

                if (this.retirementGrowthData && this.dataLoadError === null) {
                    createRetirementGrowthChart(
                        'retirementGrowthChart',
                        this.retirementGrowthData,
                        this.theme.classified
                    );
                }

                if (this.savingsData && this.dataLoadError === null) {
                    const since = String(this.savingsSince || 0);
                    const indices = this.savingsData.years
                        .map((y, i) => ({ y, i }))
                        .filter(({ y }) => y >= since);
                    let filteredSavings = {
                        years: indices.map(({ y }) => y),
                        datasets: this.savingsData.datasets.map(ds => ({
                            ...ds,
                            data: indices.map(({ i }) => ds.data[i])
                        })),
                        withdrawals: indices.map(({ i }) => this.savingsData.withdrawals[i])
                    };

                    // Determine projected savings from budget config (latest year not yet in income.csv)
                    let projectedSavings = null;
                    if (this.budgetData) {
                        const latestBudgetYear = Object.keys(this.budgetData).sort().pop();
                        const yearData = this.budgetData[latestBudgetYear];
                        const isProjected = latestBudgetYear && !this.incomeData?.years.includes(latestBudgetYear);
                        if (isProjected && yearData?.savings) {
                            projectedSavings = {
                                year: latestBudgetYear,
                                by_category: yearData.savings.by_category,
                                total: yearData.savings.totalGoal,
                                projectedIncome: yearData.income?.total || null
                            };
                            // Ensure projected year appears in filteredSavings (it may have no savings.csv data yet)
                            if (!filteredSavings.years.includes(latestBudgetYear) && latestBudgetYear >= since) {
                                filteredSavings = {
                                    years: [...filteredSavings.years, latestBudgetYear],
                                    datasets: filteredSavings.datasets.map(ds => ({
                                        ...ds, data: [...ds.data, 0]
                                    })),
                                    withdrawals: [...filteredSavings.withdrawals, 0]
                                };
                            }
                        }
                    }

                    const incomeByYear = {};
                    if (this.incomeData) {
                        this.incomeData.years.forEach((year, i) => {
                            incomeByYear[year] = this.incomeData.values[i];
                        });
                    }
                    const savingsRates = filteredSavings.years.map((year, yearIdx) => {
                        // For the projected year use planned totals / projected income
                        if (projectedSavings && year === projectedSavings.year) {
                            if (!projectedSavings.projectedIncome || !projectedSavings.total) return null;
                            return Math.round(projectedSavings.total / projectedSavings.projectedIncome * 100);
                        }
                        const income = incomeByYear[year];
                        if (!income) return null;
                        const positive = filteredSavings.datasets.reduce(
                            (sum, ds) => sum + (ds.data[yearIdx] || 0), 0
                        );
                        return Math.round(positive / income * 100);
                    });

                    createSavingsChart(
                        'savingsChart',
                        filteredSavings,
                        this.theme.classified,
                        savingsRates,
                        projectedSavings
                    );
                }

                if (this.netWorthGrowthData && this.netWorthGrowthData.length > 0 && this.dataLoadError === null) {
                    const since = String(this.netWorthGrowthSince || 0);
                    const filtered = this.netWorthGrowthData.filter(d => d.month.split('-')[0] >= since);
                    createNetWorthGrowthChart(
                        'netWorthGrowthChart',
                        filtered,
                        this.theme.classified
                    );
                }

                if (this.positionsData && this.dataLoadError === null &&
                    (this.positionsData.retirement.length > 0 || this.positionsData.nonRetirement.length > 0)) {
                    window._positionsArgs = {
                        data: this.positionsData,
                        classified: this.theme.classified,
                        positionInfo: this.positionInfoData,
                        underlyingData: this.underlyingPositionsData,
                        sectorData: this.sectorPositionsData,
                        view: this.positionsView,
                    };
                    createPositionsChart(
                        this.positionsData,
                        this.theme.classified,
                        this.positionInfoData,
                        this.underlyingPositionsData,
                        this.sectorPositionsData,
                        this.printMode ? 'all' : this.positionsView
                    );
                }

                if (this.portfolioPerformanceData && this.portfolioPerformanceData.years.length > 0 && this.dataLoadError === null) {
                    const since = String(this.portfolioPerformanceSince || 0);
                    const indices = this.portfolioPerformanceData.years
                        .map((y, i) => ({ y, i }))
                        .filter(({ y }) => y >= since);
                    const filteredPerf = {
                        years: indices.map(({ y }) => y),
                        categories: this.portfolioPerformanceData.categories,
                        data: Object.fromEntries(
                            this.portfolioPerformanceData.categories.map(cat => [
                                cat,
                                indices.map(({ i }) => this.portfolioPerformanceData.data[cat][i])
                            ])
                        ),
                        debug: this.portfolioPerformanceData.debug
                            ? Object.fromEntries(
                                this.portfolioPerformanceData.categories.map(cat => [
                                    cat,
                                    indices.map(({ i }) => this.portfolioPerformanceData.debug[cat]?.[i])
                                ])
                            )
                            : undefined
                    };
                    createPortfolioPerformanceChart(
                        'portfolioPerformanceChart',
                        filteredPerf,
                        this.theme.classified,
                        this.indexReturnsData
                    );
                }
                // Budget income Sankey — render the latest year
                if (this.budgetData && this.dataLoadError === null) {
                    const latestYear = Object.keys(this.budgetData).sort().pop();
                    const latestData = this.budgetData[latestYear];
                    if (latestData?.income) {
                        createBudgetIncomeSankeyChart(
                            'budgetIncomeSankeyChart',
                            latestData.income,
                            latestData.savings,
                            latestData.spending,
                            latestData.taxes,
                            this.theme.classified
                        );
                    }

                    // Savings progress chart
                    if (latestData?.savings) {
                        const savingsRows = Object.entries(latestData.savings.by_category || {}).map(([category, item]) => ({
                            label: category,
                            annualBudget: item.goal  || 0,
                            actual:       item.value || 0,
                            type: 'savings',
                        }));
                        createBudgetProgressChart('budgetSavingsProgressChart', savingsRows, this.theme.classified);
                    }

                    // Spending progress chart
                    const discItems = latestData?.spending?.sections?.discretionary?.items || {};
                    if (Object.keys(discItems).length > 0) {
                        const spendingRows = Object.entries(discItems).map(([label, item]) => ({
                            label, annualBudget: item.budget || 0, actual: item.spent || 0, type: 'discretionary'
                        }));
                        createBudgetProgressChart('budgetSpendingProgressChart', spendingRows, this.theme.classified);
                    }

                    // Budget baseline chart (line: combined actual vs straight-line target)
                    const baselineItems = latestData?.spending?.sections?.baseline?.items;
                    if (baselineItems) {
                        const housingBudget = baselineItems['housing']?.budget || 0;
                        const totalBudget = Object.values(baselineItems)
                            .reduce((s, v) => s + (v.budget || 0), 0);

                        const totalDiscretionaryActual = Object.values(
                            latestData?.spending?.sections?.discretionary?.items || {}
                        ).reduce((sum, item) => sum + (item.spent || 0), 0) || 0;

                        // Monthly credit spending for budget year
                        const creditByMonth = new Array(12).fill(0);
                        (this.creditSpendingData || [])
                            .filter(d => d.month.startsWith(latestYear))
                            .forEach(d => {
                                const m = parseInt(d.month.split('-')[1]) - 1;
                                creditByMonth[m] = Math.abs(d.value);
                            });

                        // Monthly cash spending for budget year
                        const cashByMonth = new Array(12).fill(0);
                        if (this.cashSpendingData) {
                            this.cashSpendingData.valueByMonth(48)
                                .filter(d => d.month.startsWith(latestYear))
                                .forEach(d => {
                                    const m = parseInt(d.month.split('-')[1]) - 1;
                                    cashByMonth[m] = Math.abs(d.value);
                                });
                        }

                        createBudgetBaselineChart(
                            'budgetBaselineChart',
                            housingBudget,
                            totalBudget,
                            creditByMonth,
                            cashByMonth,
                            totalDiscretionaryActual,
                            this.theme.classified,
                            latestYear
                        );
                    }
                }

            } catch (error) {
                console.error('Error rendering charts:', error);
            }
        },

        setPositionsView(view) {
            this.positionsView = view;
            if (this.positionsData && this.dataLoadError === null &&
                (this.positionsData.retirement.length > 0 || this.positionsData.nonRetirement.length > 0)) {
                // Defer to next tick so Alpine has shown/hidden the canvases before rendering
                this.$nextTick(() => {
                    createPositionsChart(
                        this.positionsData,
                        this.theme.classified,
                        this.positionInfoData,
                        this.underlyingPositionsData,
                        this.sectorPositionsData,
                        this.printMode ? 'all' : view
                    );
                });
            }
        },

        switchScheme(schemeName) {
            this.currentScheme = schemeName;
            this.loadTheme();
            this.renderCharts(); // Re-render charts with new colors
            this.updatePreviewChartColors(); // Update live preview with new theme
        },

        applyThemeChanges() {
            if (!THEMES[this.currentScheme]) return;

            // Commit pending palette and mapping back to THEMES (in-memory)
            THEMES[this.currentScheme].palette = JSON.parse(JSON.stringify(this.themePalette));
            THEMES[this.currentScheme].mapping = { ...this.themeMapping };

            // Rebuild classified colors from the updated palette and mapping
            const classified = {};
            for (const [purpose, path] of Object.entries(this.themeMapping)) {
                const [colorFamily, shade] = path.split('.');
                classified[purpose] = this.themePalette[colorFamily]?.[shade] || '#ff00ff';
            }

            // Update theme with new classified colors
            this.theme.classified = classified;
            this.backgroundColor = classified.background;
            this.textColor = classified.text;

            // Re-render all charts with new colors
            this.renderCharts();

            // Show "Applied!" feedback
            this.themeApplied = true;
            setTimeout(() => {
                this.themeApplied = false;
            }, 2000);
        },

        getAllThemes() {
            // Read this.theme to create a reactive dependency.
            // When loadTheme() updates this.theme after initThemes() resolves,
            // Alpine will re-run this expression and pick up the full THEMES data.
            void this.theme;
            return getAllThemes();
        },

        getThemePalette() {
            return this.themePalette;
        },

        formatColorName(name) {
            return name.replace(/_/g, ' ');
        },

        formatPurposeLabel(purpose) {
            // Convert camelCase to lowercase with spaces
            // e.g., backgroundAlt -> background alt
            // Also handle chartN -> chart N
            return purpose
                .replace(/([A-Z])/g, ' $1')
                .replace(/chart(\d)/g, 'chart $1')
                .toLowerCase()
                .trim();
        },

        getMappingPurposes() {
            return Object.keys(this.themeMapping);
        },

        getMappingColor(purpose) {
            const path = this.themeMapping[purpose];
            if (!path) return '#ff00ff';
            const [family, shade] = path.split('.');
            return this.themePalette[family]?.[shade] || '#ff00ff';
        },

        updateMapping(purpose, family, shade) {
            this.themeMapping[purpose] = `${family}.${shade}`;
            // Update preview chart only (not the whole app theme)
            this.updatePreviewChartColors();
        },

        updatePreviewChartColors() {
            const chart = window._previewChartInstance;
            if (!chart) return;

            // Get colors from current pending palette and mapping
            const getColor = (purpose) => {
                const path = this.themeMapping[purpose];
                if (!path) return '#ff00ff';
                const [family, shade] = path.split('.');
                return this.themePalette[family]?.[shade] || '#ff00ff';
            };

            // Update chart dataset colors (bars and lines)
            chart.data.datasets[0].backgroundColor = getColor('chart1');  // Assets bar
            chart.data.datasets[1].backgroundColor = getColor('chart2');  // Income bar

            // Net Worth line
            chart.data.datasets[2].borderColor = getColor('chart3');
            chart.data.datasets[2].pointBackgroundColor = getColor('chart3');
            chart.data.datasets[2].pointBorderColor = getColor('chart3');

            // Target line
            chart.data.datasets[3].borderColor = getColor('chart4');
            chart.data.datasets[3].pointBackgroundColor = getColor('chart4');
            chart.data.datasets[3].pointBorderColor = getColor('chart4');

            // Savings line
            chart.data.datasets[4].borderColor = getColor('chart5');
            chart.data.datasets[4].pointBackgroundColor = getColor('chart5');
            chart.data.datasets[4].pointBorderColor = getColor('chart5');

            // Update axis and legend colors
            const textColor = getColor('text');
            const gridColor = getColor('backgroundAlt');

            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.plugins.legend.labels.color = textColor;

            // Trigger preview panel color update via callback
            if (window._updatePreviewColors) {
                window._updatePreviewColors();
            }

            // Update chart (use default mode to ensure all properties update)
            chart.update();
        },

        async copyMappingToClipboard() {
            const themeJson = JSON.stringify({
                name: this.theme.name,
                palette: this.themePalette,
                mapping: this.themeMapping
            }, null, 4);

            try {
                await navigator.clipboard.writeText(themeJson);
                this.themeCopied = true;
                setTimeout(() => {
                    this.themeCopied = false;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        },

        deletePaletteColor(familyName) {
            const families = Object.keys(this.themePalette);
            if (families.length <= 1) return; // must keep at least one color

            // Determine fallback: first remaining family after deletion
            const remaining = families.filter(f => f !== familyName);
            const fallback = `${remaining[0]}.100`;

            // Remap any mappings pointing to the deleted family
            for (const purpose of Object.keys(this.themeMapping)) {
                if (this.themeMapping[purpose].startsWith(familyName + '.')) {
                    this.themeMapping[purpose] = fallback;
                }
            }

            // Remove from palette (Alpine reactivity requires reassignment)
            const updated = { ...this.themePalette };
            delete updated[familyName];
            this.themePalette = updated;
        },

        formatAccountCurrency(value) {
            if (value === null || value === undefined) return '—';
            const sign = value < 0 ? '-' : '';
            const abs = Math.abs(value);
            if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
            if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
            return `${sign}$${Math.round(abs)}`;
        },

        addPaletteColor() {
            const name = this.newColorName.trim();
            if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)) {
                this.newColorNameError = 'must be snake_case (e.g. my_color)';
                return;
            }
            if (this.themePalette[name]) {
                this.newColorNameError = 'color name already exists';
                return;
            }
            this.newColorNameError = '';

            const shades = generateColorShades(this.newColorHex);
            this.themePalette = { ...this.themePalette, [name]: shades };
            this.newColorName = '';
            this.newColorHex = '#808080';
        },

        // ProjectionLab sync state
        plApiKey: localStorage.getItem('pl_api_key') || '',
        plTodayMeta: JSON.parse(localStorage.getItem('pl_today_meta') || 'null'),
        plPastedMeta: '',
        plCurrentSnippet: '',
        plHistoricalSnippet: '',
        plCombinedSnippet: '',
        plCurrentCopied: false,
        plHistoricalCopied: false,
        plCombinedCopied: false,
        plDiscoveryCopied: false,

        get plIsReady() { return !!(this.plApiKey && this.plTodayMeta); },

        get plDiscoverySnippet() {
            const key = this.plApiKey || 'YOUR_KEY';
            return [
                '(async () => {',
                `  const d = await window.projectionlabPluginAPI.exportData({ key: '${key}' });`,
                '  const { savingsAccounts, investmentAccounts, assets, debts, ...meta } = d.today;',
                '  console.log(JSON.stringify(meta));',
                '})();'
            ].join('\n');
        },

        plSaveApiKey() {
            localStorage.setItem('pl_api_key', this.plApiKey);
        },

        plSaveMeta() {
            try {
                const parsed = JSON.parse(this.plPastedMeta);
                this.plTodayMeta = parsed;
                localStorage.setItem('pl_today_meta', JSON.stringify(parsed));
                this.plPastedMeta = '';
            } catch(e) {
                alert('invalid json — paste the raw console output from the discovery snippet');
            }
        },

        plResetMeta() {
            this.plTodayMeta = null;
            localStorage.removeItem('pl_today_meta');
        },

        plCopyToClipboard(text, field) {
            navigator.clipboard.writeText(text);
            this[field] = true;
            setTimeout(() => { this[field] = false; }, 2000);
        },

        plDeterministicId(name) {
            return btoa(unescape(encodeURIComponent(name))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        },

        plLatestBalance(source, accountName) {
            const today = new Date();
            const rows = (source || []).filter(r => r.account === accountName && r.date <= today);
            if (!rows.length) return 0;
            rows.sort((a, b) => b.date - a.date);
            return rows[0].value;
        },

        plBuildToday() {
            const rd = this.rawData;
            const manifest = rd ? rd.manifest : [];
            const meta = this.plTodayMeta || {};
            const savingsAccounts = [];
            const investmentAccounts = [];
            const assets = [];
            const debts = [];
            manifest.forEach(m => {
                const name = m.account;
                const title = m.title || name;
                const id = this.plDeterministicId(name);
                if (m.type === 'cash') {
                    const balance = this.plLatestBalance(rd.cash, name);
                    savingsAccounts.push({
                        type: 'savings', investmentGrowthType: 'none', dividendType: 'plan',
                        investmentGrowthRate: 0, dividendRate: 0, liquid: true, withdraw: true,
                        repurpose: true, icon: 'mdi-piggy-bank', color: 'teal-lighten-1', owner: 'me',
                        withdrawAge: { value: 'now', modifier: 'include', type: 'keyword' },
                        name, title, balance, id
                    });
                } else if (m.type === 'securities') {
                    const balance = this.plLatestBalance(rd.securities, name);
                    let type = 'taxable';
                    if (m.retirement === true) {
                        const tt = (m.tax_treatment || '').toLowerCase();
                        if (tt === 'roth 401(k)') type = 'roth-401k';
                        else if (tt === 'roth ira') type = 'roth-ira';
                        else type = '401k';
                    }
                    investmentAccounts.push({
                        type, investmentGrowthType: 'plan', dividendType: 'plan',
                        investmentGrowthRate: 0, dividendRate: 0, yearlyFee: 0, yearlyFeeType: '%',
                        liquid: true, withdraw: true, withdrawContribsFree: true, isPassiveIncome: true,
                        hasEWPenalty: true, EWPenaltyRate: 10, EWAge: 60, country: 'US',
                        costBasis: 0, icon: 'mdi-finance', color: 'blue-darken-1', owner: 'me',
                        withdrawAge: { value: 'now', modifier: 'include', type: 'keyword' },
                        name, title, balance, id
                    });
                } else if (m.type === 'property') {
                    const amount = this.plLatestBalance(rd.property, name);
                    assets.push({
                        type: 'real-estate', classification: 'residential', interestType: 'compound',
                        interestRate: 0, generateIncome: false, isPassiveIncome: false,
                        maintenanceRate: 0, insuranceRate: 0, managementRate: 0,
                        yearlyChange: { amount: 0, amountType: 'today$', type: 'appreciate', limit: 0, limitType: 'today$', limitEnabled: false },
                        icon: 'mdi-home', color: 'indigo-lighten-1', owner: 'me',
                        amountType: 'today$',
                        start: { value: 'beforeCurrentYear', type: 'keyword' },
                        end: { type: 'keyword', modifier: 'exclude', value: 'never' },
                        name, title, amount, id
                    });
                } else if (m.type === 'debt') {
                    const rawBalance = this.plLatestBalance(rd.debt, name);
                    debts.push({
                        type: 'debt', amountType: 'today$', interestRate: 0, interestType: 'compound',
                        frequency: 'monthly', monthlyPayment: 0, monthlyPaymentType: 'today$',
                        hasForgiveness: false, compounding: 'monthly',
                        icon: 'mdi-credit-card', color: 'orange-lighten-1', owner: 'me',
                        start: { value: 'now', modifier: 'include', type: 'keyword' },
                        end: { type: 'keyword', modifier: 'exclude', value: 'never' },
                        name, title, amount: Math.abs(rawBalance), id
                    });
                }
            });
            // Drop zero-balance accounts — PL ignores them and they create noise
            const nonZero = arr => arr.filter(a => (a.balance ?? a.amount ?? 0) !== 0);
            return {
                ...meta,
                savingsAccounts: nonZero(savingsAccounts),
                investmentAccounts: nonZero(investmentAccounts),
                assets: nonZero(assets),
                debts: nonZero(debts),
            };
        },

        plGenerateCurrentSnippet() {
            const today = this.plBuildToday();
            const key = this.plApiKey;
            this.plCurrentSnippet = [
                '(async () => {',
                `  const key = '${key}';`,
                `  const today = ${JSON.stringify(today, null, 2)};`,
                `  await window.projectionlabPluginAPI.restoreCurrentFinances(today, { key });`,
                `  console.log('current balances synced');`,
                '})();'
            ].join('\n');
        },

        plGenerateHistoricalSnippet() {
            const rd = this.rawData;
            const manifest = rd ? rd.manifest : [];
            const history = computeProgressHistory(rd, manifest);
            const key = this.plApiKey;
            const dateNow = new Date().toISOString().split('T')[0];
            this.plHistoricalSnippet = [
                '(async () => {',
                `  const key = '${key}';`,
                `  const progress = {`,
                `    data: ${JSON.stringify(history)},`,
                `    lastUpdated: '${dateNow}'`,
                `  };`,
                `  await window.projectionlabPluginAPI.restoreProgress(progress, { key });`,
                `  console.log('historical data synced (${history.length} months)');`,
                '})();'
            ].join('\n');
        },

        plGenerateCombinedSnippet() {
            const today = this.plBuildToday();
            const rd = this.rawData;
            const manifest = rd ? rd.manifest : [];
            const history = computeProgressHistory(rd, manifest);
            const key = this.plApiKey;
            const dateNow = new Date().toISOString().split('T')[0];
            this.plCombinedSnippet = [
                '(async () => {',
                `  const key = '${key}';`,
                `  const today = ${JSON.stringify(today, null, 2)};`,
                `  await window.projectionlabPluginAPI.restoreCurrentFinances(today, { key });`,
                `  console.log('current balances synced');`,
                `  const progress = {`,
                `    data: ${JSON.stringify(history)},`,
                `    lastUpdated: '${dateNow}'`,
                `  };`,
                `  await window.projectionlabPluginAPI.restoreProgress(progress, { key });`,
                `  console.log('historical data synced (${history.length} months)');`,
                '})();'
            ].join('\n');
        }
        };
    });
});
