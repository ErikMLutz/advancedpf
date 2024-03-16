import pandas


def main():
    output = pandas.DataFrame()

    def add_snapshot_to_output(file_name: str, account_name: str):
        df = pandas.read_csv(file_name, parse_dates=["DATES"])
        df["Assets"] = df["Assets"].str.replace('[\$,]', '', regex=True).astype(float)
        df = df.rename(columns={"DATES": "date", "Assets": "value"})
        df["account"] = account_name
        df = df[["date", "account", "value"]]

        return df

    dfs = [
        add_snapshot_to_output("1010data_401k.csv", "/fidelity/401k/1010data"),
        add_snapshot_to_output("cs_brokerage.csv", "/charles_schwab/brokerage"),
        add_snapshot_to_output("cs_ira.csv", "/charles_schwab/ira"),
        add_snapshot_to_output("cs_roth.csv", "/charles_schwab/roth_ira"),
        add_snapshot_to_output("discovery_hsa.csv", "/discovery/hsa"),
        add_snapshot_to_output("discovery_hsa_cash.csv", "/discovery/hsa/cash"),
        add_snapshot_to_output("etrade_stock_plan.csv", "/etrade/stock_plan/splunk"),
        add_snapshot_to_output("fidelity_hsa.csv", "/fidelity/hsa"),
        add_snapshot_to_output("secu_roth.csv", "/secu/roth_ira"),
        add_snapshot_to_output("splunk_401k.csv", "/fidelity/401k/splunk"),
        add_snapshot_to_output("td_brokerage.csv", "/td_ameritrade/brokerage"),
        add_snapshot_to_output("td_brokerage2.csv", "/td_ameritrade/brokerage"),
        add_snapshot_to_output("td_ira.csv", "/td_ameritrade/ira"),
        add_snapshot_to_output("td_roth.csv", "/td_ameritrade/roth_ira"),
    ]

    for df in dfs:
        output = pandas.concat([output, df], ignore_index=True)

    output = output\
        .groupby(["date", "account"]).agg({"value": "sum"})\
        .sort_values(by=["date", "account"], ascending=False)\
        .reset_index()

    output.to_csv("data/TEMP.csv", index=False)

if __name__ == "__main__":
    main()
