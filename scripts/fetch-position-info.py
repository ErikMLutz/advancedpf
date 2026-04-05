#!/usr/bin/env python3
"""Fetch position metadata (name, expense ratio, dividend yield) for each ticker
in data/positions.csv and write to web/data/position_info.json.

Output format:
{
  "FXAIX": { "name": "Fidelity 500 Index Fund", "expense_ratio": 0.015, "dividend_yield": 0.013 },
  ...
}

Requires: pip install yfinance
"""

import csv
import json
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent
POSITIONS_CSV = BASE / 'data' / 'positions.csv'
OUTPUT = BASE / 'web' / 'data' / 'position_info.json'


def get_positions():
    if not POSITIONS_CSV.exists():
        return []
    with open(POSITIONS_CSV, newline='') as f:
        reader = csv.DictReader(f)
        return sorted(set(row['position'] for row in reader if row.get('position')))


def fetch_info(ticker_symbol):
    import yfinance as yf
    t = yf.Ticker(ticker_symbol)
    info = t.info

    # Both stored as proportions (0.01 = 1%). yfinance returns these as percentages
    # (e.g. 0.25 for 0.25%, 2.26 for 2.26%), so divide by 100 to normalize.
    # expenseRatio / totalExpenseRatio / netExpenseRatio return percentages → divide by 100.
    # annualReportExpenseRatio returns a proportion already → use as-is.
    er_pct = info.get('expenseRatio') or info.get('totalExpenseRatio') or info.get('netExpenseRatio')
    er_prop = info.get('annualReportExpenseRatio')
    if er_pct is not None:
        expense_ratio = er_pct / 100
    elif er_prop is not None:
        expense_ratio = er_prop
    else:
        expense_ratio = None

    dy = info.get('dividendYield')
    dividend_yield = dy / 100 if dy is not None else None

    return {
        'name': info.get('longName') or info.get('shortName'),
        'expense_ratio': expense_ratio,
        'dividend_yield': dividend_yield,
    }


def main():
    positions = get_positions()
    if not positions:
        print('  no positions.csv found or file is empty, skipping')
        return

    print(f'Fetching info for {len(positions)} position(s)...')

    existing = {}
    if OUTPUT.exists():
        with open(OUTPUT) as f:
            existing = json.load(f)

    result = dict(existing)
    for ticker in positions:
        info = fetch_info(ticker)
        result[ticker] = info
        name_str = f" ({info['name']})" if info.get('name') else ''
        print(f'  {ticker}{name_str}')

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    print(f'  wrote {len(result)} entries to web/data/position_info.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'error: {e}', file=sys.stderr)
        sys.exit(1)
