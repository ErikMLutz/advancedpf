#!/usr/bin/env python3
"""Fetch S&P 500 annual returns (since 2020) and write to web/data/sp500_returns.json.

Output format: { "YYYY": annual_yoy_pct, ... }
Computed as December-to-December % change.
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'data', 'sp500_returns.json')
URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1mo&range=10y'
START_YEAR = 2020


def fetch():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def compute_annual_returns(payload):
    result = payload['chart']['result'][0]
    timestamps = result['timestamp']
    closes = result['indicators']['adjclose'][0]['adjclose']

    dec_close = {}
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        d = datetime.fromtimestamp(ts, tz=timezone.utc)
        if d.month == 12:
            dec_close[d.year] = close

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
    print('Fetching S&P 500 annual returns...')
    try:
        payload = fetch()
        returns = compute_annual_returns(payload)
        os.makedirs(os.path.dirname(os.path.abspath(OUTPUT)), exist_ok=True)
        with open(OUTPUT, 'w') as f:
            json.dump(returns, f, indent=2)
        print(f'  wrote {len(returns)} years to web/data/sp500_returns.json')
    except Exception as e:
        print(f'  warning: could not fetch index data ({e}), skipping', file=sys.stderr)


if __name__ == '__main__':
    main()
