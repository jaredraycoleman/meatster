import dash 
from dash.dependencies import State, Input, Output
import dash_bootstrap_components as dbc 
import dash_core_components as dcc 
import dash_html_components as html 

import pathlib

from functools import lru_cache
import pandas as pd
from datetime import datetime

thisdir = pathlib.Path(__file__).resolve().parent

@lru_cache(maxsize=32)
def get_all_data():
    return pd.read_pickle(str(thisdir.joinpath('database.pickle')))

@lru_cache(maxsize=32)
def get_reports():
    reports = get_all_data()['report'].unique()
    return reports

@lru_cache(maxsize=32)
def get_types(report: str):
    df = get_all_data()
    types = df[df['report'] == report]['type'].unique()
    return types 

@lru_cache(maxsize=32)
def get_names(report: str, cut_type: str):
    df = get_all_data()
    names = df[(df['report'] == report) & (df['type'] == cut_type)]['name'].unique()
    return names 

@lru_cache(maxsize=32)
def get_data(report: str, cut_type: str, name: str):
    df = get_all_data()
    return df[(df['report'] == report) & (df['type'] == cut_type) & (df['name'] == name)]

def to_options(elems):
    return [{'label': elem, 'value': elem} for elem in elems]

app = dash.Dash(__name__, external_stylesheets=[
    dbc.themes.JOURNAL,
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
])

price_up = html.I(className='fa fa-chevron-up fa-2x', style={'color': '#5cb85c'})
price_down = html.I(className='fa fa-chevron-down fa-2x', style={'color': '#d9534f'})


def card_wrap(body, title=None):
    if title is None:
        title = html.Div(style={'display': 'none'})
    elif isinstance(title, str):
        title = dbc.CardHeader(html.H3(title, className='text-center'))
    else:
        title = dbc.CardHeader(title)

    return dbc.Card(
        [
            title,
            dbc.CardBody(body)
        ],  className='mb-3'
    )

navbar = dbc.NavbarSimple(
    children=[
        dbc.NavItem(dbc.NavLink('Source', href='#')),
    ],
    brand='Meatster',
    brand_href='#',
    sticky='top',
    fluid=True,
)

init_reports = get_reports()
init_types = get_types(init_reports[0])
init_names = get_names(init_reports[0], init_types[0])

inputs = {
    'Report': dcc.Dropdown(options=to_options(init_reports), 
                           value=init_reports[0], id=f'dropdown-report'),
    'Type': dcc.Dropdown(options=to_options(init_types), 
                         value=init_types[0], id=f'dropdown-type'),
    'Name': dcc.Dropdown(options=to_options(init_names), 
                         value=init_names[0], id=f'dropdown-name'),
    'Dates': dcc.DatePickerSingle(id='date-picker'),
}

input_form = [
    dbc.Row([
        dbc.Col(html.H5(label, className='text-right'), width=2),
        dbc.Col(form),
    ], className='mb-2 align-items-center')
    for label, form in inputs.items()
] 


params = ['trades', 'pounds', 'low', 'high', 'weighted']
param_blocks = [
    dbc.Col(
        html.A(dbc.Card(
            [
                dbc.CardHeader(html.H5(param, className='text-center')),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col(html.Div(price_up, id=f'movement-{param}'), width=4),
                        dbc.Col(html.P('current', id=f'current-{param}'))
                    ], className='align-items-center') 
                ]),
                dbc.CardFooter('average', id=f'average-{param}')
            ],
            id=f'card-{param}'
        ), n_clicks=0, id=f'link-{param}')
    ) for param in params
]

info_panel = dbc.Col([
    dbc.Row([
        html.H5('Date Range'),
        dcc.DatePickerRange(id='date-range', className='ml-3'),
    ], className='mb-4 align-items-center'),
    dbc.Row(param_blocks),
])

body = dbc.Container([dbc.Row([
    dbc.Col([ # Left Column
        card_wrap(input_form, title='Input'),
        card_wrap(html.Pre(id='report-text', style={'height': '40vh'}), title='Report'),
    ], width=5),
    dbc.Col([ # Right Column
        card_wrap(
            dbc.Col([
                info_panel,
                dcc.Graph(id='plot')
            ])
        )
    ])
])], className='mt-4', fluid=True)

hidden_params = html.Div(
    [
    ],
    style={'display': 'none'}
)

app.layout = html.Div([navbar, body, hidden_params])
server = app.server 

@app.callback(
    [
        *(Output(f'card-{param}', 'outline') for param in params),
        *(Output(f'card-{param}', 'color') for param in params)
    ],
    [Input(f'link-{param}', 'n_clicks') for param in params]
)
def param_select(*clicks):

    selected_params = [n_clicked % 2 != 0 for param, n_clicked in zip(params, clicks)]
    colors = ['dark' if selected else None for selected in selected_params]

    return selected_params + colors

@app.callback(
    Output('plot', 'figure'),
    [Input(f'card-{param}', 'outline') for param in params] +
    [Input('dropdown-report', 'value'),
     Input('dropdown-type', 'value'),
     Input('dropdown-name', 'value'),
     Input('date-range', 'start_date'),
     Input('date-range', 'end_date')]
)
def plot_callback(*args):
    selected_params = args[:len(params)]
    selected = [param for param, selected in zip(params, selected_params) if selected]

    report, cut_type, name, start, end = args[len(params):]
    df = get_data(report, cut_type, name)

    df = df.set_index('date')[start:end]

    column_map = {
        'weighted': 'price_avg',
        'low': 'price_min',
        'high': 'price_max',
        'pounds': 'total_pounds',
        'trades': 'num_trades'
    }

    print(df.columns)

    data = []
    for param in selected:
        data.append({
            'y': df[column_map[param]].values,
            'x': df.index.values
        })

    return {'data': data}

@app.callback(
    [Output('dropdown-type', 'options'),
     Output('dropdown-type', 'value')],
    [Input('dropdown-report', 'value')]
)
def update_dropdown_type(report):
    if not report:
        return []
    types = get_types(report)
    return to_options(types), types[0]

@app.callback(
    [Output('dropdown-name', 'options'),
     Output('dropdown-name', 'value')],
    [Input('dropdown-type', 'value')],
    [State('dropdown-report', 'value')]
)
def update_dropdown_name(cut_type, report):
    if not report or not cut_type:
        return []
    names = get_names(report, cut_type)
    return to_options(names), names[0]

@app.callback(
    Output('date-picker', 'date'),
    [Input('dropdown-name', 'value')],
    [State('dropdown-report', 'value'),
     State('dropdown-type', 'value')]
)
def default_date_callback(name, report, cut_type):
    df = get_data(report, cut_type, name)
    last = df['date'].max()
    return last

@app.callback(
    [Output('date-range', 'start_date'),
     Output('date-range', 'end_date')],
    [Input('dropdown-name', 'value')],
    [State('dropdown-report', 'value'),
     State('dropdown-type', 'value')]
)
def default_date_range_callback(name, report, cut_type):
    df = get_data(report, cut_type, name)
    start = df['date'].min()
    end = df['date'].max()
    return start, end

@app.callback(
    Output('report-text', 'children'),
    [Input('dropdown-report', 'value'),
     Input('date-picker', 'date')]
)
def update_report_text(report, date):
    date = datetime.strptime(date[:10], '%Y-%m-%d')
    filename = f'{str(date.day).zfill(2)}{str(date.month).zfill(2)}{date.year}.txt'
    filename = thisdir.joinpath(report, filename)
    if not filename.is_file():
        return f'No report found for {date}'
    with filename.open() as fp:
        return fp.read()


if __name__ == '__main__':
    app.run_server(debug=True)