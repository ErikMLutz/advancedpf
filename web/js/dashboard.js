document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
        currentScheme: 'pacificMist_dark',
        backgroundColor: '#46494c',
        textColor: '#f8f8f8',
        // Hardcoded pacificMist_dark defaults — overwritten after initThemes() resolves.
        // Prevents Alpine from throwing on theme.classified.* before async fetch completes.
        theme: {
            name: 'Pacific Mist Dark',
            colors: [],
            classified: {
                background: '#46494c', backgroundAlt: '#4c5c68',
                text: '#f8f8f8', textSubtle: '#d1cfd2',
                textDark: '#1d1e1f', textDarkSubtle: '#2e373f',
                accent: '#22b3d9', accentAlt: '#54c9e8',
                chart1: '#c6eef8', chart2: '#22b3d9', chart3: '#93a3b0',
                chart4: '#333233', chart5: '#0f5061',
                chartWarn: '#dcdde0', chartAlarm: '#787578'
            }
        },
        settingsOpen: false,
        verbose: false,
        loading: true,
        loadingProgress: 0,
        netWorthData: null,
        netWorth12MonthsData: null,
        assetAllocationData: null,
        incomeData: null,
        creditSpendingData: null,
        creditByYearData: null,
        savingsData: null,
        retirementTaxData: null,
        accountsData: null,
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

                this.netWorthData = {
                    months: filteredData.map(d => d.month),
                    values: filteredData.map(d => d.value),
                    categoryBreakdowns: categoryBreakdowns
                };

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

                // Savings by year and category
                this.savingsData = computeSavingsAllocation(rawData.savings, rawData.manifest);

                // Retirement accounts by tax treatment
                this.retirementTaxData = computeRetirementTaxAllocation(sources, rawData.manifest);

                // Accounts table (current balances, split by retirement)
                this.accountsData = computeAccountsTable(sources, rawData.manifest);

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
                        this.verbose,
                        this.netWorthData.categoryBreakdowns
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
                        this.theme.classified
                    );
                }

                if (this.incomeData && this.dataLoadError === null) {
                    createIncomeChart(
                        'incomeChart',
                        this.incomeData,
                        this.theme.classified
                    );
                }

                if (this.creditSpendingData && this.dataLoadError === null) {
                    createCreditSpendingChart(
                        'creditSpendingChart',
                        this.creditSpendingData,
                        this.theme.classified
                    );
                }

                if (this.incomeData && this.creditByYearData && this.savingsData && this.dataLoadError === null) {
                    const allocationData = (() => {
                        const years = this.incomeData.years;
                        const taxes = years.map((_, i) => {
                            const income = this.incomeData.values[i];
                            if (!income) return 0;
                            const total = (this.incomeData.federalTax[i] || 0)
                                + (this.incomeData.stateTax[i] || 0)
                                + (this.incomeData.socialSecurity[i] || 0)
                                + (this.incomeData.medicare[i] || 0);
                            return total / income * 100;
                        });
                        const savings = years.map((year, i) => {
                            const income = this.incomeData.values[i];
                            if (!income) return 0;
                            const yearIdx = this.savingsData.years.indexOf(year);
                            if (yearIdx < 0) return 0;
                            const positive = this.savingsData.datasets.reduce((s, ds) => s + (ds.data[yearIdx] || 0), 0);
                            return positive / income * 100;
                        });
                        const credit = years.map((year, i) => {
                            const income = this.incomeData.values[i];
                            if (!income) return 0;
                            // Values are negative (spending), negate to get positive %
                            return -(this.creditByYearData[year] || 0) / income * 100;
                        });
                        return { years, taxes, savings, credit };
                    })();

                    createIncomeAllocationChart(
                        'incomeAllocationChart',
                        allocationData,
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

                    createTaxesChart(
                        'taxesChart',
                        this.incomeData,
                        this.theme.classified,
                        effectiveRates
                    );
                }

                if (this.retirementTaxData && this.retirementTaxData.length > 0 && this.dataLoadError === null) {
                    createRetirementTaxAllocationChart(
                        'retirementTaxAllocationChart',
                        this.retirementTaxData,
                        this.theme.classified
                    );
                }

                if (this.savingsData && this.dataLoadError === null) {
                    // Compute savings rate per year = total savings / income
                    const incomeByYear = {};
                    if (this.incomeData) {
                        this.incomeData.years.forEach((year, i) => {
                            incomeByYear[year] = this.incomeData.values[i];
                        });
                    }
                    const savingsRates = this.savingsData.years.map((year, yearIdx) => {
                        const income = incomeByYear[year];
                        if (!income) return null;
                        const positive = this.savingsData.datasets.reduce(
                            (sum, ds) => sum + (ds.data[yearIdx] || 0), 0
                        );
                        return Math.round(positive / income * 100);
                    });

                    createSavingsChart(
                        'savingsChart',
                        this.savingsData,
                        this.theme.classified,
                        savingsRates
                    );
                }
            } catch (error) {
                console.error('Error rendering charts:', error);
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
        }
    }));
});
