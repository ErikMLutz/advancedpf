# ProjectionLab Sync — Settings Tab

## Overview

A **ProjectionLab** tab in the Settings modal generates a single JavaScript snippet the user copies and pastes into the ProjectionLab browser console. The snippet syncs both current balances and historical data in one shot:

1. **Current balances** — builds a `today` object from manifest + latest CSV balances, pushes via `restoreCurrentFinances()`
2. **Historical data** — computes monthly aggregate snapshots from full CSV history, pushes via `restoreProgress()`

Plans and settings in ProjectionLab are never touched. Accounts are constructed from scratch using local account names and data — no base template or account mapping needed.

---

## Building `today` from Scratch

### `plLatestBalance(source, accountName)`

Returns the most recent balance for an account **on or before today**. The date filter is critical — `debt.csv` is pre-populated with rows through each account's payoff date, so naively taking the latest row returns `0` for active debts.

```js
plLatestBalance(source, accountName) {
    const today = new Date();
    const rows = (source || []).filter(r => r.account === accountName && r.date <= today);
    if (!rows.length) return 0;
    rows.sort((a, b) => b.date - a.date);
    return rows[0].value;
}
```

Zero-balance accounts are excluded from all output arrays before building the `today` object.

### `plDeterministicId(name)`

Deterministic ID derived from account name using a simple hash (not UUIDv5, just a stable numeric hash converted to hex). Ensures IDs stay consistent across syncs so plan references aren't broken.

### Manifest type → PL account type mapping

| Manifest `type` | `retirement` | `tax_treatment` | PL collection | PL `type` |
|---|---|---|---|---|
| `cash` | — | — | `savingsAccounts` | `savings` |
| `securities` | `false` | — | `investmentAccounts` | `taxable` |
| `securities` | `true` | *(default)* | `investmentAccounts` | `401k` |
| `securities` | `true` | `roth 401(k)` | `investmentAccounts` | `roth-401k` |
| `securities` | `true` | `roth ira` | `investmentAccounts` | `roth-ira` |
| `property` | — | — | `assets` | `real-estate` |
| `debt` | — | — | `debts` | `debt` |

### Default field values per account type

Derived from real export data (`pl-export.json`); used when the field isn't available from local data.

**savingsAccounts**
```js
{ type: 'savings', investmentGrowthType: 'none', dividendType: 'plan',
  investmentGrowthRate: 0, dividendRate: 0, liquid: true, withdraw: true,
  repurpose: true, icon: 'mdi-piggy-bank', color: 'teal-lighten-1', owner: 'me',
  withdrawAge: { value: 'now', modifier: 'include', type: 'keyword' } }
```

**investmentAccounts**
```js
{ investmentGrowthType: 'plan', dividendType: 'plan',
  investmentGrowthRate: 0, dividendRate: 0, yearlyFee: 0, yearlyFeeType: '%',
  liquid: true, withdraw: true, withdrawContribsFree: true, isPassiveIncome: true,
  hasEWPenalty: true, EWPenaltyRate: 10, EWAge: 60, country: 'US',
  costBasis: 0, icon: 'mdi-finance', color: 'blue-darken-1', owner: 'me',
  withdrawAge: { value: 'now', modifier: 'include', type: 'keyword' } }
```

**assets (real-estate)**

`amount` is the market value field (not `balance`). `amountType: 'today$'` is required. `start: 'beforeCurrentYear'` avoids PL treating the asset as newly acquired.

```js
{ type: 'real-estate', classification: 'residential', interestType: 'compound',
  interestRate: 0, generateIncome: false, isPassiveIncome: false,
  maintenanceRate: 0, insuranceRate: 0, managementRate: 0,
  yearlyChange: { amount: 0, amountType: 'today$', type: 'appreciate',
                  limit: 0, limitType: 'today$', limitEnabled: false },
  icon: 'mdi-home', color: 'indigo-lighten-1', owner: 'me',
  amountType: 'today$',
  start: { value: 'beforeCurrentYear', type: 'keyword' },
  end: { type: 'keyword', modifier: 'exclude', value: 'never' } }
```

**debts**

`amount` is the balance (positive). Raw CSV values are negative, so `Math.abs()` is applied.

```js
{ type: 'debt', amountType: 'today$', interestRate: 0, interestType: 'compound',
  frequency: 'monthly', monthlyPayment: 0, monthlyPaymentType: 'today$',
  hasForgiveness: false, compounding: 'monthly',
  icon: 'mdi-credit-card', color: 'orange-lighten-1', owner: 'me',
  start: { value: 'now', modifier: 'include', type: 'keyword' },
  end: { type: 'keyword', modifier: 'exclude', value: 'never' } }
```

### Other `today` fields

The `today` object has ~22 top-level fields beyond account lists (location, age, birthYear, schema version, etc.). These are stored in `localStorage` (`pl_today_meta`), populated once by pasting the output of a discovery snippet. The built `today` object spreads `pl_today_meta` then overwrites the four account arrays.

Discovery snippet (run once in PL console):
```js
(async () => {
  const d = await window.projectionlabPluginAPI.exportData({ key: 'YOUR_KEY' });
  const { savingsAccounts, investmentAccounts, assets, debts, ...meta } = d.today;
  console.log(JSON.stringify(meta));
})();
```

---

## Historical Data (`restoreProgress`)

Each entry in `progress.data` is a monthly aggregate snapshot. Computed by `computeProgressHistory(rawData, manifest)` in `dataProcessing.js`:

| PL field | Source |
|---|---|
| `savings` | cash accounts |
| `taxDeferred` | retirement securities where `tax_treatment` is not `roth ira` / `roth 401(k)` |
| `taxFree` | retirement securities where `tax_treatment` is `roth ira` or `roth 401(k)` |
| `taxable` | non-retirement securities |
| `assets` | property (gross, before linked debt) |
| `debt` | debt accounts (positive value) |
| `loans` | `0` |
| `crypto` | `0` |
| `netWorth` | assets + securities + cash − debts |
| `date` | Unix timestamp (ms) for the 1st of each month |

One entry per month across the full CSV history, forward-filled as usual.

---

## Settings Tab UI

A **"ProjectionLab"** tab in the existing Settings modal. Three sections:

**1. API Key**
- Text input + "Save" → `localStorage.setItem('pl_api_key', ...)`

**2. One-time setup**
- Shows the discovery snippet (copy button)
- Paste textarea + "Save" button → stores non-account `today` meta in `localStorage` as `pl_today_meta`
- Once saved, shows "configured ✓" with a "Reset" link

**3. Sync**
- Single "Generate Sync Snippet" button → renders combined snippet + copy button
- Disabled until API key and setup meta are both present
- Snippet runs `restoreCurrentFinances` then `restoreProgress` in sequence, logging progress to console

Combined snippet shape:
```js
(async () => {
  const key = '...';
  const today = { /* built from manifest + CSVs */ };
  await window.projectionlabPluginAPI.restoreCurrentFinances(today, { key });
  console.log('current balances synced');
  const progress = { data: [ /* monthly history */ ], lastUpdated: 'YYYY-MM-DD' };
  await window.projectionlabPluginAPI.restoreProgress(progress, { key });
  console.log('historical data synced (N months)');
})();
```

---

## Implementation

### Files changed

- **`web/index.html`**: ProjectionLab tab in Settings modal; all UI and snippet display
- **`web/js/dashboard.js`**: All PL state and methods added to the `dashboard()` Alpine component (not a nested `x-data` — nested `x-data` inside `x-show` fails to initialize when the parent panel is hidden)
- **`web/js/dataProcessing.js`**: `computeProgressHistory(rawData, manifest)`

### `localStorage` keys

```
pl_api_key          — the PL Plugin API key
pl_today_meta       — non-account fields of today (from one-time discovery paste)
```

---

## Out of Scope

- Plans, settings — not synced, stay in PL untouched
- Per-account historical data (PL progress API is category-level only)
- Scheduled / automatic sync
- `just` command integration
