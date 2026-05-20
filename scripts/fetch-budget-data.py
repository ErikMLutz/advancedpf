#!/usr/bin/env python3
"""Compute budget projections from data/budget.yaml.

For RSU and ESPP events: uses historical close price for past dates,
current price for future dates. Assumes all vested stock is sold immediately.
ESPP income = sell proceeds minus contributions (not total proceeds).

Outputs computed dollar totals only — no raw config values — to web/data/budget.json.

Requires: pip install yfinance pyyaml
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

import yaml

BASE = Path(__file__).parent.parent
BUDGET_YAML = BASE / 'data' / 'budget.yaml'
OUTPUT = BASE / 'web' / 'data' / 'budget.json'

TODAY = date.today()


# ---------------------------------------------------------------------------
# Stock price helpers
# ---------------------------------------------------------------------------

def fetch_current_price(ticker: str) -> float:
    import yfinance as yf
    t = yf.Ticker(ticker)
    price = t.info.get('regularMarketPrice') or t.info.get('currentPrice')
    if price is None:
        # Fall back to last close from recent history
        hist = t.history(period='5d')
        if hist.empty:
            raise ValueError(f'Could not fetch current price for {ticker}')
        price = float(hist['Close'].iloc[-1])
    return float(price)


def fetch_historical_price(ticker: str, target_date: date) -> float:
    """Return the closing price on or nearest before target_date."""
    import yfinance as yf
    # Fetch a window around the target date to handle weekends/holidays
    start = target_date - timedelta(days=7)
    end = target_date + timedelta(days=1)
    hist = yf.download(ticker, start=start.isoformat(), end=end.isoformat(),
                       progress=False, auto_adjust=True)
    if hist.empty:
        raise ValueError(f'No price data for {ticker} around {target_date}')
    # Take the last available close on or before target_date
    hist = hist[hist.index.date <= target_date]
    if hist.empty:
        raise ValueError(f'No price data for {ticker} on or before {target_date}')
    return float(hist['Close'].iloc[-1])


def get_price(ticker: str, event_date: date, current_prices: dict) -> float:
    """Historical price for past events, current price for future events."""
    if event_date <= TODAY:
        return fetch_historical_price(ticker, event_date)
    return current_prices[ticker]


def collect_tickers(income: dict) -> set:
    tickers = set()
    for entry in income.get('RSU', []):
        tickers.add(entry['ticker'])
    for entry in income.get('ESPP', []):
        tickers.add(entry['ticker'])
    return tickers


# ---------------------------------------------------------------------------
# Pay schedule helpers
# ---------------------------------------------------------------------------

def parse_date(val) -> date:
    if isinstance(val, date):
        return val
    return date.fromisoformat(str(val))


def biweekly_pay_dates(year: int, salary_ranges: list) -> list[date]:
    """Generate all biweekly pay dates for the year.

    Uses the earliest salary range start as the pay-cycle reference point,
    then steps forward in 14-day increments through the year.
    """
    ref = min(parse_date(r['start']) for r in salary_ranges)
    year_end = date(year, 12, 31)
    dates = []
    d = ref
    while d <= year_end:
        if d.year == year:
            dates.append(d)
        d += timedelta(weeks=2)
    return dates


def salary_rate_on(d: date, salary_ranges: list) -> float:
    """Annual salary rate active on a given date."""
    for r in salary_ranges:
        start = parse_date(r['start'])
        end = parse_date(r['end'])
        if start <= d < end:
            return float(r['value'])
    return 0.0


# ---------------------------------------------------------------------------
# Income component calculators
# ---------------------------------------------------------------------------

def compute_salary(year: int, salary_ranges: list) -> float:
    pay_dates = biweekly_pay_dates(year, salary_ranges)
    return sum(salary_rate_on(d, salary_ranges) / 26 for d in pay_dates)


def compute_bonus(bonus_entries: list, salary_ranges: list) -> float:
    total = 0.0
    for b in bonus_entries:
        d = parse_date(b['date'])
        rate = salary_rate_on(d, salary_ranges)
        total += rate * float(b['percentage']) * float(b['modifier'])
    return total


def compute_rsu(rsu_entries: list, current_prices: dict) -> float:
    total = 0.0
    for r in rsu_entries:
        d = parse_date(r['date'])
        price = get_price(r['ticker'], d, current_prices)
        total += int(r['shares']) * price
    return total


def compute_ltc(ltc_entries: list) -> float:
    return sum(float(e['value']) for e in ltc_entries)


def compute_espp(espp_entries: list, salary_ranges: list,
                 current_prices: dict, year: int) -> float:
    pay_dates = biweekly_pay_dates(year, salary_ranges)
    total = 0.0

    for e in espp_entries:
        purchase_date = parse_date(e['date'])

        # Contribution period: Jan–Jun for June purchase, Jul–Dec for Dec purchase
        if purchase_date.month <= 6:
            contrib_start = date(year, 1, 1)
        else:
            contrib_start = date(year, 7, 1)

        # Total employee contributions during the period
        period_pay_dates = [d for d in pay_dates if contrib_start <= d <= purchase_date]
        salary_pct = float(e['salary_contributions'])
        contributions = sum(
            salary_rate_on(d, salary_ranges) / 26 * salary_pct
            for d in period_pay_dates
        )

        # Purchase-date FMV (historical or current)
        purchase_fmv = get_price(e['ticker'], purchase_date, current_prices)

        # ESPP purchase price = min(grant FMV, purchase FMV) * (1 - discount)
        # Note: yaml field is misspelled as 'discout'
        discount = float(e.get('discount') or e.get('discout', 0))
        grant_fmv = float(e['grant_date_fmv'])
        purchase_price = min(grant_fmv, purchase_fmv) * (1 - discount)

        # Shares purchased
        if purchase_price <= 0:
            continue
        shares = contributions / purchase_price

        # Income = sell proceeds − contributions (profit only, not the return of contributions)
        sell_proceeds = shares * purchase_fmv
        total += sell_proceeds - contributions

    return total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_year(year: int, income: dict) -> dict:
    salary_ranges = income.get('salary', [])

    # Collect all tickers that need current price (future events only)
    future_tickers = set()
    for r in income.get('RSU', []):
        if parse_date(r['date']) > TODAY:
            future_tickers.add(r['ticker'])
    for e in income.get('ESPP', []):
        if parse_date(e['date']) > TODAY:
            future_tickers.add(e['ticker'])

    current_prices = {}
    for ticker in future_tickers:
        print(f'  fetching current price for {ticker}...')
        current_prices[ticker] = fetch_current_price(ticker)
        print(f'    {ticker}: ${current_prices[ticker]:.2f}')

    print('  computing salary...')
    salary = compute_salary(year, salary_ranges)

    print('  computing bonus...')
    bonus = compute_bonus(income.get('bonus', []), salary_ranges)

    print('  computing RSU...')
    rsu = compute_rsu(income.get('RSU', []), current_prices)

    print('  computing LTC...')
    ltc = compute_ltc(income.get('LTC', []))

    print('  computing ESPP...')
    espp = compute_espp(income.get('ESPP', []), salary_ranges, current_prices, year)

    total = salary + bonus + rsu + ltc + espp
    return {
        'salary': round(salary, 2),
        'bonus': round(bonus, 2),
        'RSU': round(rsu, 2),
        'LTC': round(ltc, 2),
        'ESPP': round(espp, 2),
        'total': round(total, 2),
    }


def main():
    if not BUDGET_YAML.exists():
        print('  data/budget.yaml not found, skipping')
        return

    with open(BUDGET_YAML) as f:
        budget = yaml.safe_load(f)

    budgets = budget.get('budgets', {})
    result = {}

    for year, year_data in budgets.items():
        year = int(year)
        print(f'Processing budget year {year}...')
        income = year_data.get('income', {})
        result[str(year)] = {
            'income': process_year(year, income)
        }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w') as f:
        json.dump(result, f, indent=2)
    print(f'  wrote budget data to web/data/budget.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'error: {e}', file=sys.stderr)
        sys.exit(1)
