import locale
import textwrap
from typing import List
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

import pandas
import matplotlib.pyplot as pyplot
from matplotlib.ticker import FuncFormatter
import matplotlib.patheffects as PathEffects


class Data:
    def __init__(self, source_name: str, csv_path: str):
        self.source_name = source_name
        self.df = pandas.read_csv(csv_path, parse_dates=["date"])
        self.sorted = False

    def _ensure_sorted(self):
        if self.sorted:
            return

        self.df = self.df.sort_values(by=["date"], ascending=False)

    def _ensure_month_column(self):
        if "month" not in self.df.columns:
            self.df["month"] = self.df["date"].dt.strftime("%Y-%m")

    def value_by_month(self, months=12):
        raise Exception(NotImplemented)

    def value_by_account(self):
        raise Exception(NotImplemented)

    def change_by_month(self, months=12):
        output = self.value_by_month(months=months+1)
        output["change"] = output["value"].diff()

        del output["value"]

        # drop first row which is just used to get the diff for the earliest month we care about
        output = output.drop(0)

        return output


class SnapshotData(Data):
    """Snapshots of account values over time"""

    def value_by_month(self, months: int = 12):
        self._ensure_sorted()
        self._ensure_month_column()

        # get raw data
        data = self.df\
            .groupby(["month", "account"]).first()\
            .groupby(["month"]).agg({"value": "sum"})\
            .reset_index()

        # construct full set of months to return, raw data might not include a month but we need all months for proper
        # reporting
        today = datetime.now().date()
        months = pandas.DataFrame({
            "month": [(today - relativedelta(months=i)).strftime("%Y-%m") for i in range(0, months)],
        }).sort_values(by=["month"], ascending=True)

        # join raw data into skeleton we created, do an outer join in case we need data from before the desired range to
        # forward fill with, sort so that forward fill works properly
        output = pandas.merge(months, data, on="month", how="outer").sort_values(by=["month"], ascending=True)

        # forward fill any missing data, and fill any further missing data with zeros
        output = output.ffill().fillna(0)

        # now left join to only the months we care about
        output = pandas.merge(months, output, on="month", how="left")

        return output

    def value_by_account(self):
        self._ensure_sorted()
        self._ensure_month_column()

        # get raw data
        data = self.df\
            .groupby(["month", "account"]).first()\
            .reset_index()

        # get accounts
        accounts = list(set(data["account"].values))

        # construct a frame with just this month, raw data might not include so we use this method to fill missing
        # values
        today = datetime.now().date()
        months = pandas.DataFrame({
            "month": [today.strftime("%Y-%m")] * len(accounts),
            "account": accounts,
        })

        # join raw data into skeleton we created, do an outer join in case we need data from before the desired range to
        # forward fill with, sort so that forward fill works properly
        output = pandas\
            .merge(months, data, on=["month", "account"], how="outer")\
            .sort_values(by=["month", "account"], ascending=True)

        # forward fill any missing data, and fill any further missing data with zeros
        output["value"] = output.groupby("account")["value"].ffill()
        output["value"] = output.groupby("account")["value"].fillna(0)

        # now left join to only the months we care about
        output = pandas.merge(months, output, on=["month", "account"], how="left")

        # format
        output = output[["account", "value"]]
        output = output[output["value"] != 0]
        output = output.sort_values(by=["account"]).reset_index()
        del output["index"]

        return output
            

class EventData(Data):
    """Records of account events"""

    def value_by_month(self, months: int = 12):
        self._ensure_month_column()

        # get raw data
        data = self.df\
            .groupby(["month"]).agg({"value": "sum"})\
            .reset_index()

        # construct full set of months to return, raw data might not include a month but we need all months for proper
        # reporting
        today = datetime.now().date()
        months = pandas.DataFrame({
            "month": [(today - relativedelta(months=i)).strftime("%Y-%m") for i in range(0, months)],
        }).sort_values(by=["month"], ascending=True)

        # join raw data into skeleton we created
        output = pandas.merge(months, data, on="month", how="left").sort_values(by=["month"], ascending=True)

        # fill any missing data with zeros
        output = output.fillna(0)

        return output

    def value_by_account(self):
        self._ensure_month_column()

        # get raw data
        today = datetime.now().date()
        output = self.df[self.df["month"] == today.strftime("%Y-%m")]
        output = output\
            .groupby(["account"]).agg({"value": "sum"})\
            .reset_index()

        # fill any missing data with zeros
        output = output.fillna(0)

        # format
        output = output[["account", "value"]]
        output = output[output["value"] != 0]
        output = output.sort_values(by=["account"]).reset_index()
        del output["index"]

        return output


def compute_value_over_last_12_months(sources: List[Data]) -> pandas.DataFrame:
    today = datetime.now().date()

    df = pandas.DataFrame({
        "month": [(today - relativedelta(months=i)).strftime("%Y-%m") for i in range(0, 36)],
        "value": [float(0) for _ in range(36)],
    }).sort_values(by=["month"], ascending=True).reset_index()

    for source in sources:
        value_by_month = source.value_by_month(months=36).rename(columns={"value": "source_value"})
        df = pandas.merge(df, value_by_month, on="month", how="left").fillna(float(0))
        df["value"] = df["value"] + df["source_value"]
        del df["source_value"]

    # create year-over-year comparison
    df["last_year_month"] = df["month"].map(
        lambda value: (datetime.strptime(value, "%Y-%m") - relativedelta(years=1)).strftime("%Y-%m")
    )

    df = pandas.merge(
        df.rename(columns={"month": "this_year_month"}),
        df[["month", "value"]].rename(columns={"value": "last_year_value"}),
        how="left",
        left_on="last_year_month",
        right_on="month",
    )

    df = df[["this_year_month", "value", "last_year_value"]]
    df = df.rename(columns={"this_year_month": "month"})
    df = df.sort_values(by="month")

    # calculate 6 month rolling averages
    df["value_6_month_rolling_average"] = df["value"].rolling(6, min_periods=6).mean()
    df["last_year_value_6_month_rolling_average"] = df["last_year_value"].rolling(6, min_periods=6).mean()

    # final formatting
    df = df.tail(12).reset_index()
    del df["index"]

    return df


def create_monthly_movers_plot(axes: pyplot.Axes, sources: List[Data]):
    movements = {}

    for source in sources:
        movements[source.source_name] = movements.get(source.source_name, 0) \
            + source.change_by_month(months=1)["change"].iloc[0]

    movements = [{"label": key, "change": value} for key, value in movements.items()]
    movements = sorted(movements, key=lambda item: item["change"])

    labels = [item["label"] for item in movements]
    changes = [item["change"] for item in movements]

    axes.bar(labels, changes)
    axes.set_xticks(labels, rotation=45, labels=labels)
    axes.yaxis.set_major_formatter(FuncFormatter(lambda value, position: locale.currency(value, grouping=True)))
    axes.set_title("Changes (This Month)")


def create_12_month_net_worth_plot(axes: pyplot.Axes, sources: List[Data]):
    df = compute_value_over_last_12_months(sources)

    months = df["month"]
    this_year_values = df["value"]
    last_year_values = df["last_year_value"]

    xticks = months[::2]
    xtick_labels = xticks

    bars = {
        "this year": axes.bar(months, this_year_values),
        "last year": axes.bar(months, last_year_values, width=0.5),
    }
    axes.set_title("Net Worth (Last 12 Months)")
    axes.set_xticks(xticks, rotation=45, labels=xtick_labels)
    axes.yaxis.set_major_formatter(FuncFormatter(lambda value, position: f"${value / 1000:.0f}k"))
    axes.legend(bars.values(), bars.keys(), loc="lower center", bbox_to_anchor=(0.5, 0), ncols=2)


def create_asset_categorization_plot(axes: pyplot.Axes, sources: List[Data]):
    assets = pandas.DataFrame({"account": [], "value": []})
    for source in sources:
        value_by_account = source.value_by_account()
        assets = pandas.concat([assets, value_by_account], ignore_index=True)

    # link in account manifest data
    manifest = pandas.read_csv("data/manifest.csv")
    assets = pandas.merge(assets, manifest, how="left", on="account")

    # apply debt to assets
    assets = pandas.merge(
        assets,
        assets\
                .groupby("debt_applies_to")\
                .agg({"value": "sum"})\
                .rename(columns={"value": "applicable_debt"}),
        how="left",
        left_on="account", right_on="debt_applies_to",
    )
    assets["applicable_debt"] = assets["applicable_debt"].fillna(0)
    assets["value"] = assets["value"] + assets["applicable_debt"]
    assets = assets[assets["type"] != "debt"]

    # create and aggregate by categories
    assets["category"] = assets["retirement"].map(lambda value: "retirement " if value else "") + assets["type"]
    assets = assets.groupby("category").agg({"value": "sum"}).sort_values(by=["category"]).reset_index()

    # create proportion column
    assets = assets[["category", "value"]]
    total = sum(assets["value"])
    assets["proportion"] = assets["value"] / total
    assets = assets.sort_values(by=["value"], ascending=False)

    # plot
    bottom = 0
    for _, row in assets.iterrows():
        axes.bar("assets", row["value"], bottom=bottom, label=row["category"])
        bottom += row["value"]

    axes.set_title("Net Asset Categorization")
    axes.yaxis.set_major_formatter(FuncFormatter(lambda value, position: f"${value / 1000:.0f}k"))
    axes.grid(False)
    axes.axis(False)

    for bar, (_, row) in zip(axes.patches, assets.iterrows()):
        text = axes.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_y() + bar.get_height() / 2,
            f"{row['category']} - ${row['value'] / 1000:.0f}k ({row['proportion'] * 100:.0f}%)",
            ha="center",
            va="center",
            weight="bold",
        )
        text.set_path_effects([PathEffects.withStroke(linewidth=1.5, foreground='black')])

def create_stats_plot(axes: pyplot.Axes, sources: List[Data], assets: List[Data], liabilities: List[Data], credit: List[Data]):
    df = compute_value_over_last_12_months(sources)

    net_worth = list(df["value"])[-1]
    net_worth_last_month = list(df["value"])[-2]
    net_worth_last_year = list(df["last_year_value"])[-1]

    df_assets = compute_value_over_last_12_months(assets)
    df_liabilities = compute_value_over_last_12_months(liabilities)

    total_assets = list(df_assets["value"])[-1]
    total_liabilities = list(df_liabilities["value"])[-1]

    df_credit = compute_value_over_last_12_months(credit)
    total_credit_card_spending_this_year = sum(df_credit["value"])
    total_credit_card_spending_last_year = sum(df_credit["last_year_value"])

    stats = textwrap.dedent(f"""
    Net Worth: {locale.currency(net_worth, grouping=True)}
        Assets: {locale.currency(total_assets, grouping=True)}
        Liabilities: {locale.currency(total_liabilities, grouping=True)}
        1 Month Change: {locale.currency(net_worth - net_worth_last_month, grouping=True)}
        1 Year Change: {locale.currency(net_worth - net_worth_last_year, grouping=True)}

    Credit Card Spend:
        Last 12 Months: {locale.currency(-1 * total_credit_card_spending_this_year, grouping=True)}
        Previous 12 Months: {locale.currency(-1 * total_credit_card_spending_last_year, grouping=True)}
    """).strip()

    axes.text(0, 0.9, stats, horizontalalignment="left", verticalalignment="top")
    axes.set_title("Stats")
    axes.axis(False)
    axes.grid(False)


def create_spending_plot(axes: pyplot.Axes, credit: EventData):
    df = compute_value_over_last_12_months([credit])

    months = df["month"]
    this_year_values = -1 * df["value"]
    this_year_moving_average = -1 * df["value_6_month_rolling_average"]
    last_year_moving_average = -1 * df["last_year_value_6_month_rolling_average"]

    xticks = months[::2]
    xtick_labels = xticks

    legend = {}
    legend["spend"] = axes.bar(months, this_year_values)
    axes.plot([], []); axes.plot([], []); axes.plot([], []); # force new colors
    axes.plot(months, this_year_moving_average, label="this year")
    axes.plot(months, last_year_moving_average, label="last year")
    axes.set_title("Credit Card Spending (Last 12 Months)")
    axes.set_xticks(xticks, rotation=45, labels=xtick_labels)
    axes.yaxis.set_major_formatter(FuncFormatter(lambda value, position: f"${value / 1000:.0f}k"))
    axes.legend(loc="lower center", ncols=3)


def create_all_time_net_worth_plot(axes: pyplot.Axes, sources: List[Data]):
    today = datetime.now().date()
    first_month = datetime(2013, 9, 1).date()

    months = 12 * (today.year - first_month.year) + (today.month - first_month.month)

    df = pandas.DataFrame({
        "month": [(today - relativedelta(months=i)).strftime("%Y-%m") for i in range(0, months)],
        "value": [float(0) for _ in range(months)],
    }).sort_values(by=["month"], ascending=True).reset_index()

    for source in sources:
        value_by_month = source.value_by_month(months=months).rename(columns={"value": "source_value"})
        df = pandas.merge(df, value_by_month, on="month", how="left").fillna(float(0))
        df["value"] = df["value"] + df["source_value"]
        del df["source_value"]

    months = df["month"]
    values = df["value"]

    axes.plot(months, values)

    xticks = months[months.apply(lambda month: month[-3:] == "-01")][::2]
    xtick_labels = xticks.apply(lambda month: month[:-3])

    axes.set_title("Net Worth (All Time)")
    axes.set_xticks(xticks, rotation=45, labels=xtick_labels)
    axes.yaxis.set_major_formatter(FuncFormatter(lambda value, position: f"${value / 1000:.0f}k"))

def main():
    locale.setlocale(locale.LC_ALL, '')

    cash = SnapshotData("cash", "data/cash.csv")
    property_ = SnapshotData("property", "data/property.csv")
    debt = SnapshotData("debt", "data/debt.csv")
    credit = EventData("credit", "data/credit.csv")
    securities= SnapshotData("securities", "data/securities.csv")

    sources = [cash, property_, debt, credit, securities]

    with pyplot.style.context("./themes/rose-pine-moon.mplstyle"):
        figure = pyplot.figure(figsize=(12, 7))
        grid = pyplot.GridSpec(2, 3, figure=figure)

        create_12_month_net_worth_plot(figure.add_subplot(grid[0, 0]), sources)
        create_stats_plot(figure.add_subplot(grid[0, 1]), sources, [property_, securities, cash], [debt], [credit])
        create_spending_plot(figure.add_subplot(grid[0, 2]), credit)
        create_monthly_movers_plot(figure.add_subplot(grid[1, 0]), sources)
        create_asset_categorization_plot(figure.add_subplot(grid[1, 1]), sources)
        create_all_time_net_worth_plot(figure.add_subplot(grid[1, 2]), sources)

        figure.subplots_adjust(top=0.9, bottom=0.1, left=0.1, right=0.95, hspace=1)

        pyplot.show()

if __name__ == "__main__":
    main()
