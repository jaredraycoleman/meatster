import re 
import numpy as np 
import pandas as pd
from io import StringIO

import pathlib 
from datetime import datetime

thisdir = pathlib.Path(__file__).resolve().parent 

def extract_table(lines):
    maxlen = max([len(line) for line in lines])
    lines = [line.ljust(maxlen) for line in lines]
    arr = np.array([np.array(list(line)) for line in lines])
    arr.T[np.all(arr == ' ', axis=0)] = '|'
    text = '\n'.join([re.sub(r'\|\|+', '|', ''.join(row)) for row in arr])
    return pd.read_csv(StringIO(text), sep='|', header=None)

def extract_data(text: str) -> pd.DataFrame:
    items = []
    end = 0
    for line in (line for line in text.splitlines() if line):
        m = re.match(r'(\d\d\d[a-zA-Z\s])?\s+(\d)', line)
        if m:
            imps, fl = m.groups()
            if m.end() > end:
                end = m.end()
        else:
            imps, fl = None, None
        items.append((imps, fl, line))
    
    items = [(imps, fl, line[end:]) for imps, fl, line in items]
    
    start = 999999
    for _, _, line in items:
        m = re.search(r'\s\s\d', line)
        if m: 
            loc = m.start() + 2
            if loc < start:
                start = loc

    items = [(imps, fl, line[:start].strip(),line[start:]) for imps, fl, line in items]

    impss, fls, names, lines = zip(*items)
    df = extract_table(lines)

    columns = ['num_trades', 'total_pounds', 'price_min', 'price_max', 'price_avg']
    df.columns = columns

    df['imps'] = impss
    df['fl'] = fls
    df['name'] = names 

    return df[['imps', 'fl', 'name'] + columns]    

from test_text import text_402, text_452

import re 

report_sections = {
    'LM_XB402': ['Choice Cuts', 'Select Cuts', 'CHOICE, SELECT & UNGRADED CUTS'],
    'LM_XB452': ['Upper 2/3 Choice Items Cuts', 'Lower 1/3 Choice Items', 'Branded Select Items'],
}



report_section_regexes = {
    report: re.compile(r'---+.*\n({})(?:.|\n)*?---+\n((?:.|\n)+?)(?=---+)'.format('|'.join(sections)), re.MULTILINE)
    for report, sections in report_sections.items()
}

def parse_sections(text: str, report: str):
    for section, text in report_section_regexes[report].findall(text):
        yield section, text
    

if __name__ == '__main__':
    dfs = []
    reportdir = thisdir.joinpath('reports')
    size = len(list(reportdir.glob('*/*.txt')))

    for i, report in enumerate(reportdir.glob('*/*.txt')):
        try:
            print(f'{i}/{size}')
            report_name = report.parent.name 

            date_str = report.stem[len(report_name):]
            year, month, day = date_str[:4], date_str[4:6], date_str[6:]

            date = datetime(day=int(day), month=int(month), year=int(year))

            with report.open() as fp:
                report_text = '\n'.join([line.rstrip() for line in fp.readlines() if line.strip()])

            for section, text in parse_sections(report_text, report_name):
                try:
                    df = extract_data(text)
                    df['date'] = date 
                    df['type'] = section
                    df['report'] = report_name

                    dfs.append(df)
                except:
                    print(f'Error parsing {section} in {report}')

        except:
            print(f'Error parsing {report}')

    df = pd.concat(dfs)

    df.to_pickle(str(thisdir.joinpath('database.pickle')))

    print(df)