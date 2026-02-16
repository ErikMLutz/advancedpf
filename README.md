# AdvancedPF

Personal finance dashboard that visualizes financial data from CSV files.

## Quick Start

```bash
# Generate sample data and start server
just serve --sample-data

# Visit http://localhost:8000/web/
```

**Or step by step:**
```bash
# Generate sample data
just generate-fake-data

# Start the web app
just serve
```

## Usage

### Web Dashboard (Recommended)

The web dashboard provides an interactive visualization with PDF export capability.

```bash
# Serve the dashboard
just serve

# Run tests
just test

# Generate PDF without UI interaction
just generate-pdf
```

**Features:**
- 6 interactive charts (net worth, spending, asset categorization, etc.)
- Multiple colorscheme options (dropdown selector)
- PDF export for sharing with advisors
- Auto-validation of data integrity

### Python Version (Legacy)

The original Python/matplotlib version is still available in `main.py`:

```bash
python main.py
```

## Data Management

### Sample Data

```bash
# Generate sample data and serve
just serve --sample-data

# Generate sample data only
just generate-fake-data

# Run tests with sample data
just test --sample-data
```

**Interactive confirmation:**
- Prompts for confirmation if data/ already exists
- Prevents accidental deletion of real financial data
- Type `y` to confirm deletion, `n` to cancel

### Real Data (1Password Integration)

Store your real financial data securely in 1Password:

```bash
# Load data from 1Password
just load-real-data

# Edit CSV files in data/ directory

# Save back to 1Password
just save-real-data
```

The default 1Password item name is "AdvancedPF Data Backup". Override if needed:
```bash
export ITEM_NAME="Your Custom Item Name"
```

### CSV Format

Edit the files in `data/` with your financial data:

- **cash.csv, property.csv, debt.csv, securities.csv**: Snapshot data
  - Columns: `date,account,value`
  - Date format: YYYY-MM-DD
  - One row per account per month

- **credit.csv**: Transaction/event data
  - Columns: `date,account,value`
  - Multiple transactions per month allowed

- **manifest.csv**: Account metadata
  - Columns: `account,type,retirement,debt_applies_to,primary_residence`
  - Types: cash, property, debt, securities
  - retirement: true/false
  - debt_applies_to: account name (for mortgages)
  - primary_residence: true/false

## Architecture

**Web Stack:**
- Alpine.js: Lightweight reactivity
- Chart.js: Interactive charts
- Papa Parse: CSV processing
- html2canvas + jsPDF: PDF export

**No build process** - all dependencies loaded via CDN.

See [AGENTS.md](AGENTS.md) for detailed architecture documentation.

## Sample Output

### Python Version
![sample output](sample.png)

### Web Version
Visit `http://localhost:8000` after running `just serve`
