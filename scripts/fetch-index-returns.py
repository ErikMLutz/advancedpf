#!/usr/bin/env python3
"""Fetch S&P 500 annual returns (since 2020) and write to web/data/sp500_returns.json.

Output format: { "YYYY": annual_yoy_pct, ... }
Computed as December-to-December % change.

Requires: pip install yfinance
"""

import json
import os
import sys

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'data', 'sp500_returns.json')
START_YEAR = 2020


def compute_annual_returns(df):
    # Flatten MultiIndex columns if present (yfinance >= 0.2.38 returns MultiIndex)
    if isinstance(df.columns, __import__('pandas').MultiIndex):
        df.columns = df.columns.get_level_values(0)

    closes = df['Close']
    dec_close = {dt.year: float(val) for dt, val in closes.items() if dt.month == 12}

    returns = {}
    for year in sorted(dec_close):
        if year < START_YEAR:
            continue
        prev = year - 1
        if prev in dec_close:
            pct = (dec_close[year] - dec_close[prev]) / dec_close[prev] * 100
            returns[str(year)] = round(pct, 1)

    return returns


def main():
    import yfinance as yf

    print('Fetching S&P 500 annual returns...')
    df = yf.download('^GSPC', period='10y', interval='1mo', auto_adjust=True, progress=False)
    returns = compute_annual_returns(df)
    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT)), exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(returns, f, indent=2)
    print(f'  wrote {len(returns)} years to web/data/sp500_returns.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'error: {e}', file=sys.stderr)
        sys.exit(1)
