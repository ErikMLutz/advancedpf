// Finance Dashboard - Data Processing
// Replicates pandas operations from Python version

/**
 * Helper: Group array by key function
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Function that returns grouping key
 * @returns {Map} Map of key => array of items
 */
function groupBy(array, keyFn) {
    const groups = new Map();
    array.forEach(item => {
        const key = keyFn(item);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(item);
    });
    return groups;
}

/**
 * Helper: Create skeleton of months
 * @param {number} months - Number of months to generate
 * @returns {Array<string>} Array of month strings in YYYY-MM format
 */
function createMonthSkeleton(months) {
    const result = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        result.unshift(yearMonth);
    }

    return result;
}

/**
 * Helper: Format date to YYYY-MM
 * @param {Date} date - Date object
 * @returns {string} Formatted month string
 */
function formatMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Helper: Check if an account was a primary residence for a given month.
 * Uses manifest's primary_residence_since / primary_residence_until (YYYY-MM-DD strings).
 * Comparison is at month granularity (YYYY-MM), inclusive on both ends.
 * Falls back to current month when monthStr is undefined (for current-state charts).
 * @param {Object} meta - Manifest row
 * @param {string|undefined} monthStr - Month in YYYY-MM format
 * @returns {boolean}
 */
function isPrimaryResidence(meta, monthStr) {
    const since = meta.primary_residence_since;
    const until = meta.primary_residence_until;
    if (!since && !until) return false;

    const month = monthStr || formatMonth(new Date());
    const sinceMonth = since ? since.substring(0, 7) : null;
    const untilMonth = until ? until.substring(0, 7) : null;

    if (sinceMonth && untilMonth) return month >= sinceMonth && month <= untilMonth;
    if (sinceMonth) return month >= sinceMonth;
    if (untilMonth) return month <= untilMonth;
    return false;
}

/**
 * Helper: Check if an account was an investment property for a given month.
 * Uses manifest's investment_since / investment_until (YYYY-MM-DD strings).
 * Comparison is at month granularity (YYYY-MM), inclusive on both ends.
 * Falls back to current month when monthStr is undefined (for current-state charts).
 * @param {Object} meta - Manifest row
 * @param {string|undefined} monthStr - Month in YYYY-MM format
 * @returns {boolean}
 */
function isInvestmentProperty(meta, monthStr) {
    const since = meta.investment_since;
    const until = meta.investment_until;
    if (!since && !until) return false;

    const month = monthStr || formatMonth(new Date());
    const sinceMonth = since ? since.substring(0, 7) : null;
    const untilMonth = until ? until.substring(0, 7) : null;

    if (sinceMonth && untilMonth) return month >= sinceMonth && month <= untilMonth;
    if (sinceMonth) return month >= sinceMonth;
    if (untilMonth) return month <= untilMonth;
    return false;
}

/**
 * Helper: Forward fill missing values
 * @param {Array} data - Array of {month, value} objects
 * @returns {Array} Data with forward-filled values
 */
function forwardFill(data) {
    let lastValue = 0;
    return data.map(item => {
        if (item.value !== null && item.value !== undefined) {
            lastValue = item.value;
        }
        return { ...item, value: item.value ?? lastValue };
    });
}

/**
 * Helper: Calculate rolling average
 * @param {Array<number>} values - Array of values
 * @param {number} window - Window size
 * @returns {Array<number|null>} Rolling averages (null for insufficient data)
 */
function rollingAverage(values, window = 6) {
    return values.map((_, i) => {
        if (i < window - 1) return null;
        const slice = values.slice(i - window + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / window;
    });
}

/**
 * SnapshotData class - Replicates Python SnapshotData
 */
class SnapshotData {
    constructor(sourceName, data) {
        this.sourceName = sourceName;
        this.data = data;

        // Add month column to each row
        this.data.forEach(row => {
            row.month = formatMonth(row.date);
        });
    }

    /**
     * Get value by month (replicates Python value_by_month)
     * @param {number} months - Number of months to return
     * @returns {Array} Array of {month, value} objects
     */
    valueByMonth(months = 12) {
        // Group by month and account, take first value (like pandas .first())
        const grouped = groupBy(this.data, row => `${row.month}|${row.account}`);
        const monthAccountValues = Array.from(grouped.entries()).map(([key, rows]) => {
            const [month, account] = key.split('|');
            // Sort descending by full date so the latest snapshot in the month wins
            const sorted = [...rows].sort((a, b) => b.date - a.date);
            return { month, account, value: sorted[0].value };
        });

        // Group by month only and sum values
        const monthGroups = groupBy(monthAccountValues, row => row.month);
        const rawData = Array.from(monthGroups.entries()).map(([month, rows]) => ({
            month,
            value: rows.reduce((sum, row) => sum + row.value, 0)
        }));

        // Create month skeleton
        const skeleton = createMonthSkeleton(months).map(month => ({ month, value: null }));

        // Merge raw data into skeleton (outer join)
        const merged = [...skeleton];
        rawData.forEach(row => {
            const existing = merged.find(m => m.month === row.month);
            if (existing) {
                existing.value = row.value;
            } else {
                merged.push(row);
            }
        });

        // Sort by month
        merged.sort((a, b) => a.month.localeCompare(b.month));

        // Forward fill and fill nulls with 0
        const filled = forwardFill(merged).map(row => ({
            month: row.month,
            value: row.value ?? 0
        }));

        // Return only requested months
        const requestedMonths = new Set(skeleton.map(s => s.month));
        return filled.filter(row => requestedMonths.has(row.month));
    }

    /**
     * Get value by account for current month
     * @returns {Array} Array of {account, value} objects
     */
    valueByAccount() {
        const today = new Date();
        const currentMonth = formatMonth(today);

        // Group by month and account
        const grouped = groupBy(this.data, row => `${row.month}|${row.account}`);

        // Get all unique accounts
        const accounts = [...new Set(this.data.map(row => row.account))];

        // For each account, forward fill to current month
        const result = accounts.map(account => {
            // Sort descending by full date so latest snapshot wins within a month
            const accountData = this.data
                .filter(row => row.account === account)
                .sort((a, b) => b.date - a.date);

            if (accountData.length === 0) {
                return { account, value: 0 };
            }

            // Find value for current month — first match after descending sort is the latest
            const currentMonthData = accountData.find(row => row.month === currentMonth);
            if (currentMonthData) {
                return { account, value: currentMonthData.value };
            }

            // Forward fill from most recent month — first entry is the latest after descending sort
            const mostRecent = accountData[0];
            if (mostRecent.month <= currentMonth) {
                return { account, value: mostRecent.value };
            }

            return { account, value: 0 };
        });

        // Filter out zero values and sort
        return result
            .filter(row => row.value !== 0)
            .sort((a, b) => a.account.localeCompare(b.account));
    }

    /**
     * Get value by account and month with forward-filling per account.
     * Mirrors valueByMonth but preserves account identity instead of summing.
     * @param {number} months - Number of months (same skeleton as valueByMonth)
     * @returns {Array} Array of {month, account, value} objects
     */
    valueByAccountByMonth(months) {
        const skeleton = createMonthSkeleton(months);
        const accounts = [...new Set(this.data.map(row => row.account))];
        const result = [];

        accounts.forEach(account => {
            // Sort descending by full date so latest snapshot wins within a month
            const accountRows = this.data
                .filter(row => row.account === account)
                .sort((a, b) => b.date - a.date);

            let lastValue = 0;
            skeleton.forEach(month => {
                const match = accountRows.find(row => row.month === month);
                if (match) {
                    lastValue = match.value;
                }
                result.push({ month, account, value: lastValue });
            });
        });

        return result;
    }

    /**
     * Get change by month
     * @param {number} months - Number of months
     * @returns {Array} Array of {month, change} objects
     */
    changeByMonth(months = 12) {
        const values = this.valueByMonth(months + 1);

        const changes = [];
        for (let i = 1; i < values.length; i++) {
            changes.push({
                month: values[i].month,
                change: values[i].value - values[i - 1].value
            });
        }

        return changes;
    }
}

/**
 * EventData class - Replicates Python EventData
 */
class EventData {
    constructor(sourceName, data) {
        this.sourceName = sourceName;
        this.data = data;

        // Add month column to each row
        this.data.forEach(row => {
            row.month = formatMonth(row.date);
        });
    }

    /**
     * Get value by month (sum of events in each month)
     * @param {number} months - Number of months to return
     * @returns {Array} Array of {month, value} objects
     */
    valueByMonth(months = 12) {
        // Group by month and sum values
        const grouped = groupBy(this.data, row => row.month);
        const rawData = Array.from(grouped.entries()).map(([month, rows]) => ({
            month,
            value: rows.reduce((sum, row) => sum + row.value, 0)
        }));

        // Create month skeleton
        const skeleton = createMonthSkeleton(months).map(month => ({ month, value: 0 }));

        // Merge raw data into skeleton
        skeleton.forEach(skeletonRow => {
            const dataRow = rawData.find(r => r.month === skeletonRow.month);
            if (dataRow) {
                skeletonRow.value = dataRow.value;
            }
        });

        return skeleton;
    }

    /**
     * Get value by account for current month
     * @returns {Array} Array of {account, value} objects
     */
    valueByAccount() {
        const today = new Date();
        const currentMonth = formatMonth(today);

        // Filter to current month and group by account
        const currentMonthData = this.data.filter(row => row.month === currentMonth);
        const grouped = groupBy(currentMonthData, row => row.account);

        const result = Array.from(grouped.entries()).map(([account, rows]) => ({
            account,
            value: rows.reduce((sum, row) => sum + row.value, 0)
        }));

        // Filter out zero values and sort
        return result
            .filter(row => row.value !== 0)
            .sort((a, b) => a.account.localeCompare(b.account));
    }

    /**
     * Get change by month (same as valueByMonth for event data)
     * @param {number} months - Number of months
     * @returns {Array} Array of {month, change} objects
     */
    changeByMonth(months = 12) {
        return this.valueByMonth(months).map(row => ({
            month: row.month,
            change: row.value
        }));
    }
}

/**
 * Compute value over last 12 months with year-over-year comparison
 * Replicates Python compute_value_over_last_12_months
 * @param {Array<SnapshotData|EventData>} sources - Data sources to combine
 * @returns {Array} Array with month, value, last_year_value, and rolling averages
 */
function computeValueOverLast12Months(sources) {
    // Generate 36 months of data (need history for rolling averages)
    const skeleton = createMonthSkeleton(36).map(month => ({
        month,
        value: 0
    }));

    // Sum all sources
    sources.forEach(source => {
        const sourceData = source.valueByMonth(36);
        sourceData.forEach(row => {
            const skeletonRow = skeleton.find(s => s.month === row.month);
            if (skeletonRow) {
                skeletonRow.value += row.value;
            }
        });
    });

    // Create year-over-year comparison
    const withYoY = skeleton.map(row => {
        // Find last year's month
        const [year, month] = row.month.split('-');
        const lastYearMonth = `${parseInt(year) - 1}-${month}`;
        const lastYearRow = skeleton.find(s => s.month === lastYearMonth);

        return {
            month: row.month,
            value: row.value,
            last_year_value: lastYearRow ? lastYearRow.value : 0
        };
    });

    // Calculate 6-month rolling averages
    const values = withYoY.map(row => row.value);
    const lastYearValues = withYoY.map(row => row.last_year_value);

    const valueRolling = rollingAverage(values, 6);
    const lastYearRolling = rollingAverage(lastYearValues, 6);

    const result = withYoY.map((row, i) => ({
        ...row,
        value_6_month_rolling_average: valueRolling[i],
        last_year_value_6_month_rolling_average: lastYearRolling[i]
    }));

    // Return only last 12 months
    return result.slice(-12);
}

/**
 * Categorize an account based on its metadata
 * Shared categorization logic used across charts and tooltips
 * @param {Object} account - Account object with type, retirement, primary_residence (boolean, already date-resolved)
 * @returns {string} Category name
 */
function categorizeAccount(account) {
    if (account.primary_residence === true) {
        return 'primary residence';
    } else if (account.investment_property === true) {
        return 'investment property';
    } else if (account.retirement === true) {
        return `retirement ${account.type}`;
    }
    return account.type;
}

/**
 * Get accounts with metadata and applied debt
 * Shared logic for getting account-level data with categorization
 * @param {Array} sources - Array of SnapshotData sources
 * @param {Object} manifest - Manifest data with account metadata
 * @param {boolean} currentMonthOnly - If true, use valueByAccount (current month), else use all data
 * @param {number|null} months - When provided (and currentMonthOnly=false), use forward-filled per-account data
 * @returns {Array} Array of accounts with metadata and debt applied
 */
function getAccountsWithMetadata(sources, manifest, currentMonthOnly = true, months = null) {
    // Get values by account from all sources
    const accountValues = [];

    sources.forEach(source => {
        let byAccount;
        if (currentMonthOnly) {
            byAccount = source.valueByAccount();
        } else if (months !== null) {
            byAccount = source.valueByAccountByMonth(months);
        } else {
            byAccount = source.data;
        }
        byAccount.forEach(row => {
            accountValues.push({
                account: row.account,
                value: row.value,
                month: row.month,
                sourceType: source.sourceName
            });
        });
    });

    // Merge with manifest metadata
    const assetsWithMetadata = accountValues.map(row => {
        const meta = manifest.find(m => m.account === row.account);

        if (!meta) {
            console.warn(`Account "${row.account}" not found in manifest`);
            return null;
        }

        return {
            account: row.account,
            value: row.value,
            month: row.month,
            type: meta.type || row.sourceType,
            retirement: meta.retirement === true,
            primary_residence: isPrimaryResidence(meta, row.month),
            investment_property: isInvestmentProperty(meta, row.month),
            debt_applies_to: meta.debt_applies_to || ''
        };
    }).filter(row => row !== null);

    // Apply debt to applicable accounts
    const assets = assetsWithMetadata.map(row => {
        let applicableDebt = 0;

        if (row.type !== 'debt') {
            // Find debt that applies to this account
            const debts = assetsWithMetadata.filter(d =>
                d.type === 'debt' &&
                d.debt_applies_to === row.account &&
                (!row.month || d.month === row.month) // Match month if available
            );
            applicableDebt = debts.reduce((sum, d) => sum + d.value, 0);
        }

        return {
            ...row,
            value: row.value + applicableDebt,
            category: categorizeAccount(row)
        };
    });

    // Filter out debt accounts (they've been applied)
    return assets.filter(a => a.type !== 'debt');
}

/**
 * Compute savings by year and category (stacked bar chart data)
 * Schema: year, account, amount — multiple rows per year+account are summed.
 * Positive and negative rows are split BEFORE aggregation so that a deposit
 * and a withdrawal for the same account in the same year remain independent.
 * @param {Array} savingsRows - Raw savings CSV rows
 * @param {Array} manifest - Manifest data (already parsed booleans)
 * @returns {{ years: string[], datasets: Array<{category: string, data: number[]}>, withdrawals: number[] }}
 */
function computeSavingsAllocation(savingsRows, manifest) {
    // Split raw rows by sign first — before any summation
    const positiveRows = savingsRows.filter(row => row.amount > 0);
    const negativeRows = savingsRows.filter(row => row.amount < 0);

    // Sum positive rows by year+account, then categorize
    const posTotals = {};
    positiveRows.forEach(row => {
        const key = `${row.year}|${row.account}`;
        posTotals[key] = (posTotals[key] || 0) + row.amount;
    });

    const positiveEntries = Object.entries(posTotals).map(([key, amount]) => {
        const [year, account] = key.split('|');
        const meta = manifest.find(m => m.account === account);
        if (!meta) {
            console.warn(`Account "${account}" in savings.csv not found in manifest`);
            return null;
        }
        return { year, amount, category: categorizeAccount(meta) };
    }).filter(d => d !== null);

    // Sum negative rows by year only (withdrawals don't need category breakdown)
    const negTotals = {};
    negativeRows.forEach(row => {
        const year = String(row.year);
        negTotals[year] = (negTotals[year] || 0) + row.amount;
    });

    // Sorted unique years across both sides
    const years = [...new Set([
        ...positiveEntries.map(d => d.year),
        ...Object.keys(negTotals)
    ])].sort();

    const categories = [...new Set(positiveEntries.map(d => d.category))].sort();

    const datasets = categories.map(category => ({
        category,
        data: years.map(year =>
            positiveEntries
                .filter(d => d.year === year && d.category === category)
                .reduce((sum, d) => sum + d.amount, 0)
        )
    }));

    // One negative total per year
    const withdrawals = years.map(year => negTotals[year] || 0);

    return { years, datasets, withdrawals };
}

/**
 * Compute accounts table data for current-month balances
 * Returns raw per-account values (no debt netting), with debt accounts that apply to
 * a property attached as sub-rows. Debt with no debt_applies_to (e.g. credit cards) is excluded.
 * Results are split into non-retirement and retirement groups, each sorted by value descending.
 * @param {Array} sources - Array of SnapshotData sources (cash, property, debt, securities)
 * @param {Array} manifest - Manifest data with account metadata
 * @returns {{ nonRetirement: Array, retirement: Array }}
 *   Each row: { account, value, netValue, category, debtRows, isSubRow }
 *   Sub-rows (isSubRow=true): { account, value, netValue, category, debtRows: [], isSubRow: true }
 */
function computeAccountsTable(sources, manifest) {
    // Collect current-month values for every account across all sources
    const accountValues = {};
    sources.forEach(source => {
        source.valueByAccount().forEach(row => {
            accountValues[row.account] = (accountValues[row.account] || 0) + row.value;
        });
    });

    // Index debt accounts that are linked to a specific asset (e.g. mortgages)
    const debtByAppliesTo = {};
    manifest.forEach(meta => {
        if (meta.type !== 'debt' || !meta.debt_applies_to) return;
        const value = accountValues[meta.account];
        if (!value || value === 0) return;
        if (!debtByAppliesTo[meta.debt_applies_to]) {
            debtByAppliesTo[meta.debt_applies_to] = [];
        }
        debtByAppliesTo[meta.debt_applies_to].push({ account: meta.account, title: meta.title || meta.account, value });
    });

    const nonRetirement = [];
    const retirement = [];

    manifest.forEach(meta => {
        if (meta.type === 'debt') return; // debt shown only as sub-rows
        const value = accountValues[meta.account];
        if (!value || value === 0) return;

        const debtRows = debtByAppliesTo[meta.account] || [];
        const netValue = value + debtRows.reduce((sum, d) => sum + d.value, 0);
        const category = categorizeAccount({
            ...meta,
            primary_residence: isPrimaryResidence(meta, undefined),
            investment_property: isInvestmentProperty(meta, undefined)
        });

        const taxTreatment = meta.tax_treatment || 'taxable';
        const row = { account: meta.account, title: meta.title || meta.account, value, netValue, category, taxTreatment, debtRows };
        if (meta.retirement === true) {
            retirement.push(row);
        } else {
            nonRetirement.push(row);
        }
    });

    nonRetirement.sort((a, b) => b.netValue - a.netValue);
    retirement.sort((a, b) => b.netValue - a.netValue);

    // Flatten each group: interleave parent rows with their debt sub-rows
    const flatten = (rows) => {
        const flat = [];
        rows.forEach(row => {
            flat.push({ account: row.account, title: row.title, value: row.value, netValue: row.netValue, category: row.category, taxTreatment: row.taxTreatment, debtRows: row.debtRows, isSubRow: false });
            row.debtRows.forEach(debt => {
                flat.push({ account: debt.account, title: debt.title, value: debt.value, netValue: debt.value, category: 'mortgage', taxTreatment: 'taxable', debtRows: [], isSubRow: true });
            });
        });
        return flat;
    };

    return { nonRetirement: flatten(nonRetirement), retirement: flatten(retirement) };
}

/**
 * Compute retirement account balances grouped by tax treatment
 * @param {Array} sources - Array of SnapshotData sources (cash, property, debt, securities)
 * @param {Array} manifest - Manifest data with account metadata
 * @returns {Array} Array of {treatment, value, proportion} sorted by value descending
 */
function computeRetirementTaxAllocation(sources, manifest) {
    // Get current-month values per account
    const accountValues = {};
    sources.forEach(source => {
        source.valueByAccount().forEach(row => {
            accountValues[row.account] = (accountValues[row.account] || 0) + row.value;
        });
    });

    // Filter to retirement accounts only (exclude debt)
    const retirementAccounts = manifest.filter(meta => meta.retirement === true && meta.type !== 'debt');

    // Group by tax_treatment (default: 'taxable')
    const byTreatment = {};
    retirementAccounts.forEach(meta => {
        const value = accountValues[meta.account] || 0;
        if (value === 0) return;
        const treatment = meta.tax_treatment || 'taxable';
        byTreatment[treatment] = (byTreatment[treatment] || 0) + value;
    });

    const total = Object.values(byTreatment).reduce((sum, v) => sum + v, 0);

    return Object.entries(byTreatment)
        .map(([treatment, value]) => ({
            treatment,
            value,
            proportion: total > 0 ? value / total : 0
        }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Compute asset allocation by category (replicates Python asset categorization logic)
 * @param {Array} sources - Array of SnapshotData sources (cash, property, debt, securities)
 * @param {Object} manifest - Manifest data with account metadata
 * @returns {Array} Array of {category, value, proportion} sorted by value descending
 */
function computeAssetAllocation(sources, manifest) {
    // Get accounts with metadata and debt applied using shared logic
    const accountsWithMetadata = getAccountsWithMetadata(sources, manifest, true);

    // Group by category and sum
    const categoryGroups = groupBy(accountsWithMetadata, item => item.category);
    const aggregated = Array.from(categoryGroups.entries()).map(([category, items]) => ({
        category,
        value: items.reduce((sum, item) => sum + item.value, 0)
    }));

    // Calculate proportions
    const total = aggregated.reduce((sum, item) => sum + item.value, 0);
    const withProportions = aggregated.map(item => ({
        ...item,
        proportion: total > 0 ? item.value / total : 0
    }));

    // Sort by value descending
    return withProportions.sort((a, b) => b.value - a.value);
}
