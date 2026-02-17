// Finance Dashboard - Data Loader
// Handles CSV and YAML loading

/**
 * Load a single CSV file
 * @param {string} path - Path to CSV file
 * @returns {Promise<Array>} Parsed CSV data
 */
async function loadCSV(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.statusText}`);
        }

        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn(`Warnings parsing ${path}:`, results.errors);
                    }
                    resolve(results.data);
                },
                error: (error) => {
                    reject(new Error(`Error parsing ${path}: ${error.message}`));
                }
            });
        });
    } catch (error) {
        throw new Error(`Failed to load CSV ${path}: ${error.message}`);
    }
}

/**
 * Load and parse a YAML file, normalizing the manifest's dict-of-accounts
 * into an array of { account, ...fields } objects with defaults applied.
 * @param {string} path - Path to YAML file
 * @returns {Promise<Array>} Normalized manifest rows
 */
async function loadManifestYAML(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    const text = await response.text();
    const parsed = jsyaml.load(text);
    return Object.entries(parsed.accounts).map(([account, fields]) => ({
        account,
        type: fields.type ?? null,
        retirement: fields.retirement ?? false,
        debt_applies_to: fields.debt_applies_to ?? null,
        primary_residence: fields.primary_residence ?? false,
        ...fields,
    }));
}

/**
 * Load all data files in parallel
 * @returns {Promise<Object>} Object containing all loaded data
 */
async function loadAllData() {
    try {
        const [cash, property, debt, securities, credit, manifest, income, savings] = await Promise.all([
            loadCSV(CONFIG.dataPaths.cash),
            loadCSV(CONFIG.dataPaths.property),
            loadCSV(CONFIG.dataPaths.debt),
            loadCSV(CONFIG.dataPaths.securities),
            loadCSV(CONFIG.dataPaths.credit),
            loadManifestYAML(CONFIG.dataPaths.manifest),
            loadCSV(CONFIG.dataPaths.income),
            loadCSV(CONFIG.dataPaths.savings)
        ]);

        // Validate that we got data
        if (!cash || !property || !debt || !securities || !credit || !manifest || !income || !savings) {
            throw new Error('One or more data files is empty');
        }

        // Parse dates for snapshot and event data
        // Use local time to avoid timezone offset issues
        const parseDate = (item) => {
            if (item.date) {
                const dateStr = item.date;
                // Parse YYYY-MM-DD as local date (not UTC)
                const [year, month, day] = dateStr.split('-').map(Number);
                item.date = new Date(year, month - 1, day || 1);
            }
            return item;
        };

        cash.forEach(parseDate);
        property.forEach(parseDate);
        debt.forEach(parseDate);
        securities.forEach(parseDate);
        credit.forEach(parseDate);

        return {
            cash,
            property,
            debt,
            securities,
            credit,
            manifest,
            income,
            savings
        };
    } catch (error) {
        throw new Error(`Failed to load data: ${error.message}`);
    }
}

/**
 * Validate data integrity
 * Checks that all accounts in data files exist in manifest
 * @param {Object} data - Loaded data object
 * @returns {Array<string>} Array of warning messages (empty if no issues)
 */
function validateData(data) {
    const warnings = [];
    const manifestAccounts = new Set(data.manifest.map(m => m.account));

    // Check all data sources for accounts not in manifest
    const checkAccounts = (source, sourceName) => {
        const accounts = [...new Set(source.map(item => item.account))];
        accounts.forEach(account => {
            if (!manifestAccounts.has(account)) {
                warnings.push(`Account "${account}" in ${sourceName}.csv not found in manifest.yaml`);
            }
        });
    };

    checkAccounts(data.cash, 'cash');
    checkAccounts(data.property, 'property');
    checkAccounts(data.debt, 'debt');
    checkAccounts(data.securities, 'securities');
    checkAccounts(data.credit, 'credit');

    return warnings;
}
