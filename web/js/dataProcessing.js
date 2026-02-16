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
            return { month, account, value: rows[0].value };
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
            // Get all data for this account, sorted by month
            const accountData = this.data
                .filter(row => row.account === account)
                .sort((a, b) => a.month.localeCompare(b.month));

            if (accountData.length === 0) {
                return { account, value: 0 };
            }

            // Find value for current month or most recent
            const currentMonthData = accountData.find(row => row.month === currentMonth);
            if (currentMonthData) {
                return { account, value: currentMonthData.value };
            }

            // Forward fill from most recent month
            const mostRecent = accountData[accountData.length - 1];
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
 * @param {Object} account - Account object with type, retirement, primary_residence
 * @returns {string} Category name
 */
function categorizeAccount(account) {
    if (account.primary_residence === true) {
        return 'primary residence';
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
 * @returns {Array} Array of accounts with metadata and debt applied
 */
function getAccountsWithMetadata(sources, manifest, currentMonthOnly = true) {
    // Get values by account from all sources
    const accountValues = [];

    sources.forEach(source => {
        const byAccount = currentMonthOnly ? source.valueByAccount() : source.data;
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
            retirement: meta.retirement === true || meta.retirement === 'true' || meta.retirement === 'TRUE',
            primary_residence: meta.primary_residence === true || meta.primary_residence === 'true' || meta.primary_residence === 'TRUE',
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
