
import requests 
import pathlib
import pandas as pd 
import json

thisdir = pathlib.Path(__file__).resolve().parent

URL = "https://mpr.datamart.ams.usda.gov/services/v1.1/reports"

REPORTS = {
    "2457": [
        "Summary",
        "Current Volume",
        "Upper 2-3 Choice Items",
        "Lower 1-3 Choice Items",
        "Branded Select"
    ]
}
START = "01/01/2015"
END = "03/10/2021"

def main():
    for report, sections in REPORTS.items():
        for section in sections:
            print(report, section)
            url = f"{URL}/{report}/{section}?q=published_date={START}:{END}"
            res = requests.get(url)
            
            savepath = thisdir.joinpath(report, section, "data.json")
            savepath.parent.mkdir(parents=True, exist_ok=True)
            savepath.write_text(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    main()