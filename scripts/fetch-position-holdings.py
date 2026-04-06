#!/usr/bin/env python3
"""Fetch underlying holdings and sector weightings for positions.

Reads data/positions.csv for unique tickers.

Holdings sources (tried in order):
  1. Vanguard API  – full holdings with pagination (Vanguard ETFs)
  2. SEC N-PORT + OpenFIGI – top 600 holdings by weight from the fund's
     most recent NPORT-P filing; CUSIPs mapped to tickers via OpenFIGI

Outputs:
  web/data/position_holdings.json
    { "VTI": { "AAPL": 0.0589, ... }, "FBTC": {}, ... }
    Values are fractions (0.0589 = 5.89%). Empty dict = no holdings data
    (crypto ETF, individual stock, or no data available).

  web/data/position_sectors.json
    { "VTI": { "technology": 0.311, "financial services": 0.124, ... }, ... }
    Sector weightings per fund from yfinance, keyed by display name.

Requires: pip install yfinance requests
"""

import csv
import json
import re
import time
import sys
import threading
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
import yfinance as yf

BASE = Path(__file__).parent.parent
POSITIONS_CSV = BASE / 'data' / 'positions.csv'
HOLDINGS_OUTPUT = BASE / 'web' / 'data' / 'position_holdings.json'
SECTORS_OUTPUT = BASE / 'web' / 'data' / 'position_sectors.json'

SEC_HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; personal-finance-dashboard; contact@example.com)'}
NPORT_NS = {'n': 'http://www.sec.gov/edgar/nport'}
# Fetch top N holdings from N-PORT; covers 90%+ for most broad market funds
NPORT_HOLDING_LIMIT = 600


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_positions():
    if not POSITIONS_CSV.exists():
        return []
    with open(POSITIONS_CSV, newline='') as f:
        reader = csv.DictReader(f)
        return sorted(set(row['position'] for row in reader if row.get('position')))


def format_sector(key):
    return key.replace('_', ' ')


# ---------------------------------------------------------------------------
# Source 1: Vanguard API
# ---------------------------------------------------------------------------

def fetch_vanguard_holdings(ticker):
    """
    Fetch full holdings from Vanguard's public ETF API with pagination.
    Returns {symbol: fraction} or None if ticker is not a Vanguard fund.
    """
    base_url = f'https://investor.vanguard.com/investment-products/etfs/profile/api/{ticker}/portfolio-holding/stock'
    try:
        r = requests.get(base_url, params={'start': 1, 'count': 500},
                         headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
        if not r.ok:
            return None
        data = r.json()
        total = data.get('size', 0)
        if total == 0:
            return None

        all_entities = list(data['fund']['entity'])
        start = 501
        while start <= total:
            r2 = requests.get(base_url, params={'start': start, 'count': 500},
                              headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
            if not r2.ok:
                break
            page = r2.json().get('fund', {}).get('entity', [])
            if not page:
                break
            all_entities.extend(page)
            start += 500

        result = {}
        for h in all_entities:
            symbol = h.get('ticker', '').strip()
            pct_str = h.get('percentWeight', '')
            if symbol and pct_str:
                try:
                    result[symbol] = float(pct_str) / 100
                except ValueError:
                    pass
        return result if result else None

    except Exception:
        return None


# ---------------------------------------------------------------------------
# Source 2: SEC N-PORT + OpenFIGI
# ---------------------------------------------------------------------------

_mf_ticker_map = None  # {ticker: (cik, series_id)}
_mf_ticker_map_lock = threading.Lock()
_print_lock = threading.Lock()


def tprint(*args, **kwargs):
    with _print_lock:
        print(*args, **kwargs)

def _load_mf_ticker_map():
    global _mf_ticker_map
    if _mf_ticker_map is not None:
        return _mf_ticker_map
    with _mf_ticker_map_lock:
        if _mf_ticker_map is not None:  # re-check after acquiring lock
            return _mf_ticker_map
        r = requests.get('https://www.sec.gov/files/company_tickers_mf.json',
                         headers=SEC_HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()
        fields = data['fields']
        cik_idx = fields.index('cik')
        series_idx = fields.index('seriesId')
        symbol_idx = fields.index('symbol')
        _mf_ticker_map = {
            row[symbol_idx]: (str(row[cik_idx]), row[series_idx])
            for row in data['data'] if row[symbol_idx]
        }
    return _mf_ticker_map


def _get_latest_nport_accession(series_id):
    """Return the accession number string for the most recent NPORT-P for a series."""
    url = (f'https://www.sec.gov/cgi-bin/browse-edgar'
           f'?action=getcompany&company=&CIK={series_id}'
           f'&type=NPORT-P&dateb=&owner=include&count=5')
    r = requests.get(url, headers=SEC_HEADERS, timeout=20)
    r.raise_for_status()
    # Accession numbers appear as 18-digit strings in the HTML
    matches = re.findall(r'(\d{18})', r.text)
    return matches[0] if matches else None


def _cusips_to_tickers(cusips):
    """
    Map a list of CUSIPs to ticker symbols via the OpenFIGI API.
    Returns {cusip: ticker_or_None}.
    Rate limit: 25 requests/minute without an API key.
    """
    result = {}
    batch_size = 100
    batches = [cusips[i:i + batch_size] for i in range(0, len(cusips), batch_size)]

    for batch_num, batch in enumerate(batches):
        if batch_num > 0:
            time.sleep(2.5)  # stay within 25 req/min rate limit

        payload = [{'idType': 'ID_CUSIP', 'idValue': c} for c in batch]
        try:
            r = requests.post('https://api.openfigi.com/v3/mapping',
                              json=payload,
                              headers={'Content-Type': 'application/json'},
                              timeout=20)
            if r.status_code == 429:
                tprint('    OpenFIGI rate limit hit, waiting 60s...')
                time.sleep(60)
                r = requests.post('https://api.openfigi.com/v3/mapping',
                                  json=payload,
                                  headers={'Content-Type': 'application/json'},
                                  timeout=20)
            if not r.ok:
                for c in batch:
                    result[c] = None
                continue

            for i, item in enumerate(r.json()):
                data = item.get('data', [])
                # Prefer the composite (primary) US equity entry
                primary = next(
                    (d for d in data
                     if d.get('figi') == d.get('compositeFIGI')
                     and d.get('marketSector') == 'Equity'),
                    None
                )
                if not primary:
                    primary = next(
                        (d for d in data if d.get('marketSector') == 'Equity'),
                        data[0] if data else None
                    )
                result[batch[i]] = primary.get('ticker') if primary else None
        except Exception as e:
            tprint(f'    OpenFIGI batch error: {e}')
            for c in batch:
                result[c] = None

    return result


def fetch_nport_holdings(ticker):
    """
    Fetch holdings from the fund's most recent SEC NPORT-P filing.
    Maps CUSIPs to tickers via OpenFIGI.
    Returns {symbol_or_name: fraction} or None if not found.
    """
    ticker_map = _load_mf_ticker_map()
    if ticker not in ticker_map:
        return None

    cik, series_id = ticker_map[ticker]

    accession = _get_latest_nport_accession(series_id)
    if not accession:
        return None

    xml_url = f'https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/primary_doc.xml'
    r = requests.get(xml_url, headers=SEC_HEADERS, timeout=60)
    if not r.ok:
        return None

    root = ET.fromstring(r.content)
    holdings = root.findall('.//n:invstOrSec', NPORT_NS)

    rows = []
    for h in holdings:
        pct = float(h.findtext('n:pctVal', namespaces=NPORT_NS) or 0)
        cusip = h.findtext('n:cusip', namespaces=NPORT_NS)
        name = h.findtext('n:name', namespaces=NPORT_NS) or ''
        if pct > 0:
            rows.append((pct, cusip, name))

    # Sort by weight descending, take top N
    rows.sort(reverse=True)
    rows = rows[:NPORT_HOLDING_LIMIT]

    if not rows:
        return None

    # Map CUSIPs to tickers
    cusips = [c for _, c, _ in rows if c]
    tprint(f'    mapping {len(cusips)} CUSIPs via OpenFIGI...')
    cusip_to_ticker = _cusips_to_tickers(cusips)

    result = {}
    for pct, cusip, name in rows:
        ticker_symbol = cusip_to_ticker.get(cusip) if cusip else None
        if not ticker_symbol:
            continue  # skip holdings that can't be resolved to a ticker symbol
        result[ticker_symbol] = result.get(ticker_symbol, 0) + pct / 100  # pctVal is %, store as fraction

    return result


# ---------------------------------------------------------------------------
# Source 3: yfinance top holdings
# ---------------------------------------------------------------------------

def fetch_yfinance_holdings(ticker):
    """
    Fetch top holdings from yfinance fund data.
    Returns {symbol: fraction} or None if unavailable.
    Note: typically covers only the top 10-25 holdings by weight.
    """
    try:
        fd = yf.Ticker(ticker).funds_data
        th = fd.top_holdings
        if th is None or (hasattr(th, 'empty') and th.empty):
            return None
        result = {}
        for symbol, row in th.iterrows():
            # yfinance returns 'Holding Percent' as a fraction (e.g. 0.172 = 17.2%)
            pct = row.get('Holding Percent') if hasattr(row, 'get') else row['Holding Percent']
            if pct is not None and symbol:
                result[str(symbol)] = float(pct)
        return result if result else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Sector weightings (yfinance)
# ---------------------------------------------------------------------------

def fetch_sector_weightings(ticker):
    """Returns {sector_name: weight} from yfinance fund data."""
    try:
        sw = yf.Ticker(ticker).funds_data.sector_weightings
        if not sw:
            return {}
        return {
            format_sector(k): float(v)
            for k, v in sw.items()
            if v and float(v) > 0
        }
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def fetch_holdings(ticker):
    """Try Vanguard API, SEC N-PORT, then yfinance top holdings."""
    vanguard = fetch_vanguard_holdings(ticker)
    if vanguard:
        return vanguard, 'vanguard'

    nport = fetch_nport_holdings(ticker)
    if nport:
        return nport, 'nport'

    yfin = fetch_yfinance_holdings(ticker)
    if yfin:
        return yfin, 'yfinance'

    return {}, 'none'


def main():
    positions = get_positions()
    if not positions:
        print('  no positions.csv found or file is empty, skipping')
        return

    print(f'Fetching holdings and sector weightings for {len(positions)} position(s)...')

    existing_holdings = {}
    if HOLDINGS_OUTPUT.exists():
        with open(HOLDINGS_OUTPUT) as f:
            existing_holdings = json.load(f)

    existing_sectors = {}
    if SECTORS_OUTPUT.exists():
        with open(SECTORS_OUTPUT) as f:
            existing_sectors = json.load(f)

    holdings_result = {}
    sectors_result = {}

    def process_ticker(ticker):
        holdings, source = fetch_holdings(ticker)
        sectors = fetch_sector_weightings(ticker)
        if holdings:
            coverage = sum(holdings.values()) * 100
            tprint(f'  {ticker}: {len(holdings)} holdings ({coverage:.0f}% coverage) via {source}'
                   + (f', {len(sectors)} sectors' if sectors else ''))
        else:
            tprint(f'  {ticker}: no holdings data (crypto ETF, direct stock, or unsupported)'
                   + (f', {len(sectors)} sectors' if sectors else ''))
        return ticker, holdings, sectors

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_ticker, t): t for t in positions}
        for future in as_completed(futures):
            ticker, holdings, sectors = future.result()
            holdings_result[ticker] = holdings
            sectors_result[ticker] = sectors

    HOLDINGS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(HOLDINGS_OUTPUT, 'w') as f:
        json.dump(holdings_result, f, indent=2)
    print(f'\nwrote {len(holdings_result)} entries to web/data/position_holdings.json')

    with open(SECTORS_OUTPUT, 'w') as f:
        json.dump(sectors_result, f, indent=2)
    print(f'wrote {len(sectors_result)} entries to web/data/position_sectors.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'error: {e}', file=sys.stderr)
        sys.exit(1)
