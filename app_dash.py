import dash
from dash import dcc, html, Input, Output, State, dash_table
from dash.dependencies import ClientsideFunction, ALL, MATCH # ClientsideFunction, ALL, MATCH 임포트
import dash_daq as daq # 다크 모드 토글 위해 추가
import plotly.express as px
import pandas as pd
import base64
import io
import json
import re # 정규 표현식 사용을 위해 추가
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np # 표준편차 계산 위해 추가
from datetime import datetime # 날짜 처리를 위해 추가
import logging
from logging.handlers import RotatingFileHandler
import sys
from flask_caching import Cache
from utils.dataframes import parse_df_raw, get_numeric_df_raw

# 로깅 설정 (콘솔 + 순환 파일 핸들러)
logger = logging.getLogger("position_helper")
if not logger.handlers:
    logger.setLevel(logging.DEBUG)
    log_formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)s | %(name)s | %(module)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_formatter)

    file_handler = RotatingFileHandler('app.log', maxBytes=1000000, backupCount=3, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(log_formatter)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

def _handle_uncaught_exception(exc_type, exc_value, exc_traceback):
    # 치명적 오류를 파일과 콘솔에 기록하고, 서버가 즉시 종료되지 않도록 보호
    if issubclass(exc_type, KeyboardInterrupt):
        return
    logger.exception("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = _handle_uncaught_exception

# 스타일시트 추가 (기존 CSS는 제거하고, assets 폴더 사용)
app = dash.Dash(__name__, suppress_callback_exceptions=True, assets_folder='assets')
app.title = "포지션 배정 도우미"

# 간단 캐시(Single-process). 개인용 성능 최적화 목적
cache = Cache(app.server, config={
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300
})

# === Config / Constants ===
SW_COLUMN_NAME = 'SW 배정 횟수'

# Dash/Flask 기본 로거에 동일한 핸들러 연결
try:
    app.logger.handlers = []
    app.logger.propagate = False
    app.logger.setLevel(logger.level)
    for h in logger.handlers:
        app.logger.addHandler(h)
except Exception:
    logger.warning("Failed to attach handlers to app.logger")

app.layout = html.Div(id='app-container', children=[
    html.A('본문으로 건너뛰기', href='#main-content', className='skip-link'),
    html.Div([
        html.H1("🎯 포지션 배정 도우미"),
        daq.BooleanSwitch(id='dark-mode-switch', on=False, label="다크 모드", labelPosition="top", style={'float': 'right'})
    ], style={'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '10px'}),
    
    # 공통 저장소들
    dcc.Store(id='stored-data', storage_type='local'),
    dcc.Store(id='theme-store', storage_type='local'),
    dcc.Store(id='theme-trigger-store'),
    dcc.Store(id='absence-data', storage_type='local'),
    dcc.Store(id='team-members-store', storage_type='local'),  # 팀원 정보 저장용
    dcc.Store(id='team-activity-log', storage_type='local'),  # 팀원 활동 로그
    
    # 다운로드 컴포넌트들
    dcc.Download(id="download-integrated-json"),

    # 탭 구조
    dcc.Tabs(id="main-tabs", value="main-tab", className="custom-tabs", children=[
        # 메인 탭 (기존 기능들)
        dcc.Tab(label="📊 포지션 관리", value="main-tab", className="custom-tab", children=[
            html.Div(className="tab-content", children=[
                html.P("JSON 파일을 업로드하여 팀원들의 포지션 배정 현황을 관리하고 다음 주 배정을 제안받으세요.", 
                       style={'marginBottom': '30px'}),

                # JSON 업로드 영역
                html.Div([
                    html.H5("JSON 파일 업로드", className='json-upload-title'),
                    dcc.Upload(
                        id='upload-integrated-data',
                        children=html.Div([
                            'JSON 파일 드래그 앤 드롭 또는 ',
                            html.A('파일 선택', href='#', style={'pointer-events': 'auto'})
                        ], className='upload-button-text'),
                        className='upload-component',
                        multiple=False,
                        accept='.json,application/json',
                        style={'width': '100%', 'height': '100%', 'cursor': 'pointer'}
                    ),
                    html.Div(id='integrated-upload-status', style={'marginTop': '10px'})
                ], className='json-upload-section'),

                # 데이터 표시 및 편집 테이블
                html.Div(id='main-content', className='card', children=[
                    html.H4("데이터 확인 및 편집", style={'marginTop': '0', 'marginBottom': '20px'}),
                    dcc.Loading(type='dot', children=html.Div(id='output-data-table')),
                    html.Div([
                        html.Button('통합 JSON으로 저장', id='save-integrated-button', n_clicks=0, className='button primary'),
                        html.Div(id='save-status', style={'marginTop': '15px'})
                    ], style={'marginTop': '20px', 'textAlign': 'right'})
                ]),

                # 불참자 관리 영역
                html.Div(className='card', children=[
                    html.Div([
                        html.H4("불참자 관리", style={'marginTop': '0', 'marginBottom': '10px', 'display': 'inline-block'}),
                        html.Button(
                            html.I("펼치기 ▼", id="absence-collapse-icon"), 
                            id='absence-collapse-button',
                            className='button secondary',
                            n_clicks=0,
                            style={'float': 'right', 'border': 'none', 'background': 'transparent', 'padding': '0'}
                        )
                    ], style={'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'width': '100%'}),
                    
                    html.Div(id='absence-collapse-content', className='collapse-content collapsed', children=[
                        html.Hr(style={'marginTop': '10px', 'marginBottom': '20px'}),
                        # 날짜 선택기
                        html.Div([
                            html.Label("날짜 선택", style={'marginBottom': '8px', 'display': 'block', 'fontWeight': '500'}),
                            dcc.DatePickerSingle(
                                id='absence-date-picker',
                                display_format='YYYY-MM-DD',
                                date=datetime.now().date(),
                                style={'marginBottom': '20px', 'width': '100%'}
                            ),
                        ], style={'width': '48%', 'display': 'inline-block', 'marginRight': '4%'}),
                        
                        # 팀원 선택 드롭다운
                        html.Div([
                            html.Label("불참자 선택", style={'marginBottom': '8px', 'display': 'block', 'fontWeight': '500'}),
                            dcc.Dropdown(
                                id='absence-member-dropdown',
                                value=None,  # 명시적 초기값 설정
                                placeholder="불참 팀원을 선택하세요",
                                multi=False,
                                clearable=False,
                                style={'marginBottom': '20px'}
                            ),
                        ], style={'width': '48%', 'display': 'inline-block'}),
                        
                        # 비고(사유) 입력 필드
                        html.Div([
                            html.Label("불참 사유", style={'marginBottom': '8px', 'display': 'block', 'fontWeight': '500'}),
                            dcc.Input(
                                id='absence-reason-input',
                                type='text',
                                value='',  # 명시적 초기값 설정
                                placeholder="불참 사유를 입력하세요 (선택)",
                                style={'width': '100%', 'padding': '8px', 'marginBottom': '20px'},
                                debounce=True
                            ),
                        ]),
                        
                        # 버튼 영역 (왼쪽: 추가, 오른쪽: 초기화)
                        html.Div([
                            html.Div([
                                html.Button('불참자 추가', id='add-absence-button', className='button primary', n_clicks=0),
                                html.Div(id='absence-add-status', role='status', style={'marginTop': '10px'})
                            ], style={'display': 'inline-block'}),
                            
                            html.Div([
                                html.Button('불참 데이터 초기화', id='reset-absence-button', className='button danger', n_clicks=0),
                                html.Div(id='absence-save-status', role='status', style={'marginTop': '10px'})
                            ], style={'display': 'inline-block', 'float': 'right'})
                        ], style={'marginBottom': '20px', 'overflow': 'hidden'}),
                        
                        # 불참자 현황 테이블
                        html.H5("불참자 현황", style={'marginTop': '20px', 'marginBottom': '15px'}),
                        html.Div(id='absence-table-container'),
                        
                        # 불참 통계 요약
                        html.H5("불참 횟수 통계", style={'marginTop': '20px', 'marginBottom': '15px'}),
                        html.Div(id='absence-stats-container')
                    ])
                ]),

                # 시각화 영역
                html.H4("데이터 시각화", style={'marginTop': '50px', 'marginBottom': '20px'}),
                dcc.Loading(type='dot', children=html.Div(id='static-visualizations-container')),

                # 불참 시각화 영역
                html.H4("불참 시각화", style={'marginTop': '50px', 'marginBottom': '20px'}),
                dcc.Loading(type='dot', children=html.Div(id='absence-visualizations-container'))
            ])
        ]),
        
        # 팀원 관리 탭 (새로 추가)
        dcc.Tab(label="👥 팀원 관리", value="team-tab", className="custom-tab", children=[
            html.Div(id="team-management-content")
        ])
    ])
])

# --- Helper Functions ---
@cache.memoize()
def parse_df(json_data: str) -> pd.DataFrame:
    """JSON(str, orient='split') → pandas.DataFrame (캐시됨)."""
    return parse_df_raw(json_data)

@cache.memoize()
def get_numeric_df(json_data: str) -> pd.DataFrame:
    """parse_df 결과를 수치형으로 강제 변환(비수치 NaN), 캐시됨."""
    return get_numeric_df_raw(json_data)

# 공통 사용자 메시지 빌더
def user_msg(message, level='info'):
    """레벨에 따라 스타일 클래스가 지정된 사용자 메시지 Span 생성."""
    class_map = {
        'success': 'success-message',
        'error': 'error-message',
        'warning': 'warning-message',
        'info': 'info-message'
    }
    return html.Span(str(message), className=class_map.get(level, 'info-message'))

# 테마별 공통 색상 계산
def get_theme_colors(theme_data):
    """테마 데이터에 따라 공통 색상 팔레트/템플릿 반환."""
    is_dark = theme_data.get('dark', False) if theme_data else False
    base_bg = '#1c1c1e' if is_dark else '#ffffff'
    default_text_color = '#e0e0e0' if is_dark else '#1d1d1f'
    header_bg = '#333333' if is_dark else '#f8f8f8'
    border_color = '#444444' if is_dark else '#e0e0e0'
    plotly_template = "plotly_dark" if is_dark else "plotly_white"
    return {
        'is_dark': is_dark,
        'base_bg': base_bg,
        'default_text_color': default_text_color,
        'header_bg': header_bg,
        'border_color': border_color,
        'plotly_template': plotly_template
    }

def get_optimized_color_palettes():
    """과학적으로 검증된 색상 팔레트를 반환 - 가독성과 효율성 최적화"""
    return {
        # 색각 이상자 친화적 정성적 색상 (최대 8개까지 권장)
        'qualitative_safe': [
            '#1f77b4',  # 블루
            '#ff7f0e',  # 오렌지  
            '#2ca02c',  # 그린
            '#d62728',  # 레드
            '#9467bd',  # 퍼플
            '#8c564b',  # 브라운
            '#e377c2',  # 핑크
            '#7f7f7f'   # 그레이
        ],
        
        # 정량적 연속 색상 (단일 색조 - 향상된 Blues)
        'sequential_blue': [
            '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1',
            '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'
        ],
        
        # 정량적 연속 색상 (다중 색조 - 성능용)
        'sequential_viridis': [
            '#440154', '#482777', '#3f4a8a', '#31678e',
            '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'
        ],
        
        # 발산 색상 (Deviation) - 향상된 RdBu
        'diverging_rdbu': [
            '#67001f', '#b2182b', '#d6604d', '#f4a582',
            '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de',
            '#4393c3', '#2166ac', '#053061'
        ],
        
        # 하이 컨트라스트 색상 (중요한 구분용)
        'high_contrast': [
            '#000000',  # 블랙
            '#e69f00',  # 오렌지
            '#56b4e9',  # 스카이 블루  
            '#009e73',  # 블루시 그린
            '#f0e442',  # 옐로우
            '#0072b2',  # 블루
            '#d55e00',  # 버밀리온
            '#cc79a7'   # 적자주색
        ]
    }

def get_color_for_chart_type(chart_type, num_colors=None, is_dark=False):
    """차트 타입에 따른 최적화된 색상 반환 - 가독성과 효율성 우선"""
    palettes = get_optimized_color_palettes()
    
    if chart_type == 'treemap':
        # 트리맵: 단일 색조 그라데이션 (Viridis가 더 시각적으로 효과적)
        return 'Viridis'
        
    elif chart_type == 'boxplot':
        # 박스플롯: 정성적 색상 (색각 이상자 친화적)
        if num_colors and num_colors <= len(palettes['qualitative_safe']):
            return palettes['qualitative_safe'][:num_colors]
        return palettes['qualitative_safe']
        
    elif chart_type == 'heatmap':
        # 히트맵: 향상된 블루 스케일 (더 넓은 범위)
        return 'viridis'
        
    elif chart_type == 'heatmap_deviation':
        # 편차 히트맵: 향상된 RdBu (중앙값 강조)
        return 'RdBu_r'
        
    elif chart_type == 'pie':
        # 파이 차트: 하이 컨트라스트 색상 (구분력 극대화)
        if num_colors and num_colors <= len(palettes['high_contrast']):
            return palettes['high_contrast'][:num_colors]
        return palettes['high_contrast']
        
    elif chart_type == 'bar':
        # 바 차트: 정성적 색상
        if num_colors and num_colors <= len(palettes['qualitative_safe']):
            return palettes['qualitative_safe'][:num_colors]
        return palettes['qualitative_safe']
        
    elif chart_type == 'line':
        # 라인 차트: 정성적 색상 (선별 가능한 색상)
        return palettes['qualitative_safe']
        
    else:
        # 기본값: 안전한 정성적 색상
        return palettes['qualitative_safe']

def enhance_chart_accessibility(fig, chart_type='default'):
    """차트 접근성 향상을 위한 추가 설정"""
    try:
        # 텍스트 크기 및 가독성 향상
        fig.update_layout(
            font=dict(size=14, family="Arial, sans-serif"),
            title_font_size=16,
            hoverlabel=dict(
                bgcolor="rgba(255,255,255,0.9)",
                bordercolor="rgba(0,0,0,0.3)",
                font_size=12
            )
        )
        
        # 차트 타입별 접근성 개선
        if chart_type in ['bar', 'boxplot']:
            # 바 차트와 박스플롯: 격자선 강화
            fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(128,128,128,0.3)')
            fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(128,128,128,0.3)')
            
        elif chart_type in ['heatmap', 'heatmap_deviation']:
            # 히트맵: 컬러바 레이블 강화
            fig.update_coloraxes(colorbar_title_font_size=14)
            
        elif chart_type == 'pie':
            # 파이 차트: 경계선 추가로 구분력 향상
            fig.update_traces(
                marker_line=dict(color='white', width=2),
                textfont_size=14,
                textfont_color='white'
            )
            
        return fig
        
    except Exception as e:
        logger.warning(f"차트 접근성 향상 중 오류: {e}")
        return fig

# 공통 Figure 스타일 적용 헬퍼
def style_figure(fig, template, height=None):
    """Plotly Figure 공통 레이아웃/폰트/여백 등을 적용."""
    try:
        fig.update_layout(
            template=template,
            margin=dict(l=50, r=30, t=60, b=40),
            font=dict(size=12),
            title_font_size=18,
            autosize=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=-0.2,
                xanchor="center",
                x=0.5,
                font=dict(size=12)
            )
        )
        fig.update_xaxes(title_font=dict(size=14), tickfont=dict(size=12), showgrid=False)
        fig.update_yaxes(title_font=dict(size=14), tickfont=dict(size=12), showgrid=True, gridwidth=0.5, gridcolor='rgba(128,128,128,0.2)')
        if height is not None:
            fig.update_layout(height=height)
    except Exception as e:
        logger.warning(f"[style] Failed to apply common figure style: {e}")
    return fig

# 테이블 생성 헬퍼 함수 (테마별 스타일링 포함)
def create_table_with_theme(df_display, df, jsonified_data, colors):
    """DataFrame과 테마 색상을 받아 DataTable 생성."""
    is_dark = colors['is_dark']
    base_bg = colors['base_bg']
    default_text_color = colors['default_text_color']
    header_bg = colors['header_bg']
    border_color = colors['border_color']
    
    # 조건부 스타일 텍스트 색상 정의
    low_dev_text_color_dark = '#77b6ff'
    low_dev_text_color_light = '#005fcc'
    high_dev_text_color_dark = '#ff8080'
    high_dev_text_color_light = '#d92121'
    
    low_dev_text_color = low_dev_text_color_dark if is_dark else low_dev_text_color_light
    high_dev_text_color = high_dev_text_color_dark if is_dark else high_dev_text_color_light
    
    styles = []
    # 숫자형 데이터만 추출하고 NaN은 무시하여 평균/표준편차 계산
    df_numeric = get_numeric_df(jsonified_data)
    
    if not df_numeric.empty:
        numeric_cols = df_numeric.columns
        means = df_numeric.mean(skipna=True)
        stds = df_numeric.std(skipna=True)
        
        # 변동성 기준으로 상위 컬럼만 선택 (최대 5개)
        col_variability = {}
        for col in numeric_cols:
            mean = means[col]
            std = stds[col]
            if pd.isna(std) or std == 0 or pd.isna(mean):
                continue
            # 변동계수(CV)로 변동성 측정
            col_variability[col] = std / mean if mean != 0 else 0
        
        # 상위 변동성 컬럼 선택 (최대 5개)
        top_variable_cols = sorted(col_variability.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # 표준편차의 배수로 임계값 설정
        threshold_multiplier = 1.0
        
        for col, _ in top_variable_cols:
            mean = means[col]
            std = stds[col]
            if pd.isna(std) or std == 0:
                continue
                
            lower_bound = mean - threshold_multiplier * std
            upper_bound = mean + threshold_multiplier * std
            
            # 평균보다 낮은 값 스타일
            styles.append({
                'if': {
                    'filter_query': f'{{{col}}} < {lower_bound}',
                    'column_id': col
                },
                'color': low_dev_text_color,
                'fontWeight': 'bold'
            })
            # 평균보다 높은 값 스타일
            styles.append({
                'if': {
                    'filter_query': f'{{{col}}} > {upper_bound}',
                    'column_id': col
                },
                'color': high_dev_text_color,
                'fontWeight': 'bold'
            })
    
    return dash_table.DataTable(
        id='editable-table',
        columns=[{"name": i, "id": i, "editable": (i != df.index.name)} for i in df_display.reset_index().columns],
        data=df_display.reset_index().to_dict('records'),
        editable=True,
        row_deletable=True,
        filter_action="native",
        sort_action="native",
        sort_mode="multi",
        virtualization=True,
        fixed_rows={"headers": True},
        page_action='none',
        style_table={
            'overflowX': 'auto',
            'overflowY': 'auto',
            'height': '600px',
        },
        style_cell={
            'minWidth': '100px', 'width': '150px', 'maxWidth': '300px',
            'overflow': 'hidden',
            'textOverflow': 'ellipsis',
            'backgroundColor': base_bg,
            'color': default_text_color,
            'textAlign': 'center',
            'fontWeight': '500',
            'fontSize': '16px',
            'padding': '12px 8px',
            'border': f'1px solid {border_color}',
        },
        style_header={
            'backgroundColor': header_bg,
            'color': default_text_color,
            'fontWeight': '600',
            'textAlign': 'center',
            'padding': '14px 8px',
            'border': f'1px solid {border_color}'
        },
        style_filter={
            'backgroundColor': base_bg,
            'color': default_text_color,
            'padding': '8px',
            'border': f'1px solid {border_color}'
        },
        style_data_conditional=styles
    )

# 안전한 콜백 ID 파싱 헬퍼 함수
def safe_parse_callback_id(prop_id_str):
    """Dash prop_id 문자열에서 패턴 ID dict를 안전 추출."""
    """콜백 ID를 안전하게 파싱합니다. eval() 대신 json.loads() 사용"""
    try:
        id_part = prop_id_str.split('.')[0]
        return json.loads(id_part.replace("'", '"'))  # 작은따옴표를 큰따옴표로 변경
    except (json.JSONDecodeError, IndexError, AttributeError) as e:
        logger.error(f"콜백 ID 파싱 오류: {e}, prop_id: {prop_id_str}")
        return None

# 입력 검증 헬퍼 함수들
def validate_member_name(name):
    """팀원 이름 유효성 검사"""
    if not name or not isinstance(name, str):
        return False, "이름을 입력해주세요."
    
    name = name.strip()
    if len(name) == 0:
        return False, "이름을 입력해주세요."
    if len(name) < 2:
        return False, "이름은 최소 2글자 이상이어야 합니다."
    if len(name) > 50:
        return False, "이름은 50글자를 초과할 수 없습니다."
    
    # 특수문자 제한 (기본적인 문자, 숫자, 한글, 영문, 공백, 하이픈만 허용)
    if not re.match(r'^[가-힣a-zA-Z0-9\s\-_\.]+$', name):
        return False, "이름에는 한글, 영문, 숫자, 공백, 하이픈, 밑줄, 마침표만 사용할 수 있습니다."
    
    return True, ""

# 활동 로그 렌더링 헬퍼 함수 (타임스탬프/메시지 색상 계층화)
def render_activity_log(activity_log):
    try:
        if not isinstance(activity_log, list) or len(activity_log) == 0:
            return ""
        lines = []
        for entry in activity_log:
            ts = ""
            msg = ""
            level = "info"
            if isinstance(entry, dict):
                ts = entry.get('ts') or entry.get('timestamp') or ""
                msg = str(entry.get('msg', ""))
                level = entry.get('level', 'info')
            else:
                s = str(entry)
                if s.startswith("[") and "]" in s:
                    try:
                        ts = s[1:s.index("]")]
                        msg = s[s.index("]")+2:]
                    except Exception:
                        msg = s
                else:
                    msg = s
                if "삭제" in msg:
                    level = "warning"
                elif ("오류" in msg) or ("찾을 수 없습니다" in msg) or ("실패" in msg):
                    level = "error"
                elif ("추가" in msg) or ("변경되었" in msg) or ("저장" in msg):
                    level = "success"
                else:
                    level = "info"
            color_map = {
                'success': '#22c55e',
                'warning': '#f59e0b',
                'error': '#ef4444',
                'info': '#e5e7eb'
            }
            ts_span = html.Span(f"[{ts}] ", style={
                'color': '#94a3b8',
                'fontWeight': '500'
            }) if ts else html.Span("")
            msg_span = html.Span(msg, style={
                'color': color_map.get(level, '#e5e7eb')
            })
            line = html.Div([ts_span, msg_span], style={
                'fontFamily': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                'fontSize': '12.5px'
            })
            lines.append(line)
        return lines
    except Exception:
        return ""

def validate_member_memo(memo):
    """팀원 메모 유효성 검사"""
    if memo and len(memo) > 1000:
        return False, "메모는 1000글자를 초과할 수 없습니다."
    return True, ""

# Helper function to calculate total absences
def calculate_total_absences(absence_data):
    """
    absence_data에서 팀원별 총 불참 횟수를 계산합니다.
    
    Args:
        absence_data (dict): 불참 데이터 (dates 필드 포함)
        
    Returns:
        dict: 팀원별 총 불참 횟수
    """
    if not absence_data or "dates" not in absence_data:
        return {}
    
    total_absences = {}
    for date, info in absence_data["dates"].items():
        for member in info["absent_members"]:
            total_absences[member] = total_absences.get(member, 0) + 1
            
    return total_absences

# Helper function to filter active members
def get_active_members(member_list, team_members_data):
    """
    팀원 목록에서 활성 상태인 팀원만 필터링합니다.
    
    Args:
        member_list (list): 전체 팀원 목록
        team_members_data (dict): 팀원 메타데이터 (is_active 필드 포함)
        
    Returns:
        list: 활성 상태인 팀원 목록
    """
    if not team_members_data or 'members' not in team_members_data:
        # 팀원 데이터가 없으면 모든 인원을 활성으로 간주
        return member_list
    
    active_members = []
    members_dict = team_members_data.get('members', {})
    
    for member in member_list:
        # 팀원 데이터에 없거나 is_active가 True인 경우 활성으로 간주
        if member not in members_dict:
            active_members.append(member)
        elif members_dict[member].get('is_active', True):
            active_members.append(member)
    
    return active_members

# --- 콜백 함수들 --- #

# 팀원 관리 탭 콘텐츠 생성 콜백
@app.callback(
    Output('team-management-content', 'children'),
    [Input('main-tabs', 'value'),
     Input('theme-store', 'data')]
)
def render_team_management_content(active_tab, theme_data):
    if active_tab != 'team-tab':
        return dash.no_update
    
    colors = get_theme_colors(theme_data)
    
    return html.Div(className="tab-content", children=[
        html.H3("팀원", style={'marginBottom': '16px', 'color': colors['default_text_color']}),

        # 팀원 추가 + 목록 통합 섹션 (미니멀)
        html.Div(className='card modern-card', children=[
            dcc.Store(id='team-memo-edit-store', data={'editing_member_id': None}),

            # 컴팩트 입력 행: 이름 + 추가 버튼
            html.Div(style={'display': 'flex', 'gap': '8px', 'alignItems': 'center', 'marginBottom': '8px'}, children=[
                dcc.Input(id='new-member-name', type='text', value='', placeholder="팀원 이름",
                          className='modern-input', debounce=True, style={'flex': '1'}),
                html.Button('추가', id='add-member-button', className='button primary', n_clicks=0)
            ]),
            html.Div(id='add-member-status', className='text-muted', style={'marginBottom': '6px'}),

            # 고급 옵션(메모/활성) 접기/펼치기
            html.Button('고급 옵션 ▼', id='toggle-new-member-advanced', className='button tertiary', n_clicks=0,
                        style={'padding': '6px 8px', 'marginBottom': '8px'}),
            html.Div(id='new-member-advanced', className='collapse-content collapsed', children=[
                html.Div(className='input-group', children=[
                    html.Label("메모", className='input-label'),
                    dcc.Textarea(id='new-member-memo', value='', placeholder="팀원에 대한 메모 (선택)",
                                 className='modern-textarea', style={'marginBottom': '12px', 'resize': 'vertical', 'minHeight': '60px'})
                ]),
                html.Div(className='toggle-group', children=[
                    html.Label("활성 상태", className='input-label'),
                    html.Div(className='toggle-container', children=[
                        daq.BooleanSwitch(id='new-member-active', on=True, label="", labelPosition="top",
                                          className='modern-toggle', color="#007aff"),
                        html.Span("활성 (휴가 시 비활성화)", className='toggle-description')
                    ])
                ], style={'marginBottom': '4px'})
            ]),

            html.Hr(style={'margin': '12px 0'}),

            # 목록
            html.Div(id='team-status-message', style={'marginBottom': '10px'}),
            html.Div(id='team-members-list-container')
        ]),

        # 활동 로그 섹션 (항상 표시)
        html.Div(className='card', children=[
            html.H4("활동 로그", style={'marginTop': '0', 'marginBottom': '12px'}),
            html.Pre(id='team-activity-log-view', className='code-block', style={'maxHeight': '220px', 'overflowY': 'auto', 'whiteSpace': 'pre-wrap'})
        ])
    ])

# 팀원 목록 업데이트 콜백
@app.callback(
    Output('team-members-list-container', 'children'),
    [Input('team-members-store', 'data'),
     Input('stored-data', 'data'),
     Input('theme-store', 'data'),  # 테마 변경도 Input으로 추가
     Input('team-memo-edit-store', 'data')],
    prevent_initial_call=False  # 초기 로드 시에도 실행되도록 설정
)
def update_team_members_list(team_members_data, stored_data, theme_data, memo_edit_data):
    colors = get_theme_colors(theme_data)
    editing_member_id = None
    try:
        if isinstance(memo_edit_data, dict):
            editing_member_id = memo_edit_data.get('editing_member_id')
    except Exception:
        editing_member_id = None
    
    # 포지션 데이터에서 팀원 목록 추출
    current_members = []
    if stored_data:
        try:
            df = parse_df(stored_data)
            current_members = df.index.tolist()
        except (ValueError, json.JSONDecodeError, pd.errors.ParserError) as e:
            logger.warning(f"[team] 포지션 데이터 파싱 오류: {e}")
            current_members = []
        except Exception as e:
            logger.error(f"[team] 예상치 못한 오류: {e}")
            current_members = []
    
    # 저장된 팀원 데이터와 병합
    all_members = {}
    if team_members_data and 'members' in team_members_data:
        all_members = team_members_data['members'].copy()
    
    # 현재 데이터의 팀원들도 추가 (기본 정보로)
    for member in current_members:
        if member not in all_members:
            all_members[member] = {
                'name': member,
                'memo': '',
                'is_active': True,
                'preferences': {}
            }
    
    if not all_members:
        return html.Div(className='empty-state', children=[
            html.Div('🙇\u200d♂️', style={'fontSize': '28px', 'marginBottom': '6px'}),
            html.P("등록된 팀원이 없습니다. 위에서 새 팀원을 추가하거나 포지션 데이터를 업로드하세요.", style={'margin': '0'})
        ])
    
    # 팀원 카드 생성
    member_cards = []
    for member_id, member_info in all_members.items():
        try:
            # 안전한 데이터 접근
            if not isinstance(member_info, dict):
                logger.warning(f"[team] 잘못된 팀원 데이터 형식: {member_id}")
                continue
                
            is_active = member_info.get('is_active', True)
            memo = member_info.get('memo', '')
            name = member_info.get('name', member_id)  # name이 없으면 ID 사용
            
            # 활성 상태에 따른 스타일 조정
            card_opacity = '1' if is_active else '0.6'
            name_style = {
                'margin': '0 0 8px 0', 
                'color': colors['default_text_color'],
                'fontSize': '18px',
                'fontWeight': '600',
                'display': 'flex',
                'alignItems': 'center',
                'gap': '10px'
            }
            
            # 배지는 비활성일 때만 중립 컬러로 표시 (애플틱한 절제)
            status_badge = (
                html.Span(
                    "휴가",
                    className='status-badge',
                    style={
                        'fontSize': '12px',
                        'padding': '4px 8px',
                        'borderRadius': '10px',
                        'backgroundColor': '#f2f2f7',
                        'color': '#6e6e73',
                        'fontWeight': '600',
                        'letterSpacing': '0.02em'
                    }
                ) if not is_active else None
            )
            
            card = html.Div(
                className='team-member-card modern-member-card', tabIndex=0,
                style={
                    'border': f'2px solid {colors["border_color"]}',
                    'borderRadius': '16px',
                    'padding': '20px',
                    'marginBottom': '16px',
                    'backgroundColor': colors['base_bg'],
                    'display': 'flex',
                    'justifyContent': 'space-between',
                    'alignItems': 'flex-start',
                    'opacity': card_opacity,
                    'transition': 'all 0.3s ease',
                    'boxShadow': '0 2px 8px rgba(0,0,0,0.06)'
                },
                children=[
                    html.Div(className='member-info', children=[
                        html.Div([
                            html.H5(name, style=name_style),
                            status_badge
                        ], style={'display': 'flex', 'alignItems': 'center', 'gap': '12px', 'marginBottom': '10px'}),
                        (
                            html.Div([
                                html.P(
                                    (memo[:100] + "...") if (isinstance(memo, str) and len(memo) > 100) else (memo if memo else "메모 없음"),
                                    className='member-memo',
                                    style={
                                        'margin': '0',
                                        'fontSize': '14px',
                                        'color': colors['default_text_color'] if memo else '#999',
                                        'fontStyle': 'normal' if memo else 'italic',
                                        'lineHeight': '1.4',
                                        'maxWidth': '400px'
                                    }
                                ),
                                html.Button('편집',
                                           id={'type': 'edit-member-memo-btn', 'index': member_id},
                                           className='button tertiary icon-button',
                                           title='메모 편집',
                                           **{'aria-label': f"{name} 메모 편집"})
                            ], style={'display': 'flex', 'alignItems': 'center', 'gap': '8px'})
                            if member_id != editing_member_id else
                            html.Div([
                                dcc.Textarea(
                                    id={'type': 'edit-member-memo-input', 'index': member_id},
                                    value=memo or '',
                                    placeholder='메모를 입력하세요',
                                    className='modern-textarea',
                                    style={'minHeight': '70px', 'width': '100%'}
                                ),
                                html.Div([
                                    html.Button('확인', id={'type': 'save-member-memo-btn', 'index': member_id}, className='button primary', n_clicks=0),
                                    html.Button('취소', id={'type': 'cancel-member-memo-btn', 'index': member_id}, className='button secondary', n_clicks=0, style={'marginLeft': '8px'})
                                ], style={'marginTop': '8px'})
                            ])
                        )
                    ], style={'flex': '1', 'marginRight': '20px'}),
                    html.Div(className='member-actions', children=[
                        # 활성/비활성 토글
                        html.Div(className='toggle-mini', children=[
                            daq.BooleanSwitch(
                                id={'type': 'toggle-member-status', 'index': member_id},
                                on=is_active,
                                label="",
                                labelPosition="top",
                                size=35,
                                color="#007aff"
                            ),
                        ], style={'marginBottom': '10px'}),
                        html.Div([
                            html.Button('삭제', 
                                       id={'type': 'delete-member-btn', 'index': member_id}, 
                                       className='button danger icon-button',
                                       title='삭제',
                                       style={'padding': '6px 10px', 'minWidth': '36px'},
                                       **{'aria-label': f"{name} 삭제"})
                        ])
                    ], style={'display': 'flex', 'flexDirection': 'column', 'alignItems': 'center'})
                ]
            )
            member_cards.append(card)
        except Exception as e:
            logger.error(f"[team] 팀원 카드 생성 오류 (ID: {member_id}): {e}")
            # 오류가 발생한 팀원은 건너뛰고 계속 처리
    
    # 메타 정보 (카운트 칩) + 그리드 컨테이너로 감싸서 반환
    try:
        total_count = len(all_members)
        active_count = sum(1 for _id, info in all_members.items() if isinstance(info, dict) and info.get('is_active', True))
    except Exception:
        total_count, active_count = len(member_cards), len(member_cards)

    meta = html.Div(className='team-list-meta', children=[
        html.Span(f"팀원 {total_count}명 · 활성 {active_count}명", className='count-chip')
    ])

    grid = html.Div(member_cards, className='team-members-grid')

    return html.Div([meta, grid])

# --- 팀원 관리 탭: 접기/펼치기 토글 콜백들 --- #
@app.callback(
    Output('new-member-advanced', 'className'),
    Output('toggle-new-member-advanced', 'children'),
    Input('toggle-new-member-advanced', 'n_clicks'),
    prevent_initial_call=False
)
def toggle_new_member_advanced(n):
    is_open = (n or 0) % 2 == 1
    return ("collapse-content expanded" if is_open else "collapse-content collapsed",
            ("고급 옵션 ▲" if is_open else "고급 옵션 ▼"))


# 활동 로그는 항상 표시하므로 토글 콜백 제거

## 포지션/분석 드롭다운 관련 콜백 제거됨

# 팀원 추가 콜백 (활동 로그 포함)
@app.callback(
    [Output('team-members-store', 'data', allow_duplicate=True),
     Output('add-member-status', 'children'),
     Output('new-member-name', 'value'),
     Output('new-member-memo', 'value'),
     Output('new-member-active', 'on'),
     Output('team-activity-log', 'data', allow_duplicate=True),
     Output('team-activity-log-view', 'children', allow_duplicate=True),
     Output('stored-data', 'data', allow_duplicate=True)],
    Input('add-member-button', 'n_clicks'),
    [State('new-member-name', 'value'),
     State('new-member-memo', 'value'),
     State('new-member-active', 'on'),
     State('team-members-store', 'data'),
     State('team-activity-log', 'data'),
     State('stored-data', 'data')],
    prevent_initial_call=True
)
def add_team_member(n_clicks, name, memo, is_active, current_data, activity_log, stored_data):
    if not n_clicks:
        return (dash.no_update, dash.no_update, dash.no_update, dash.no_update,
                dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update)
    
    # 입력 검증
    name_valid, name_error = validate_member_name(name)
    if not name_valid:
        return (dash.no_update, 
                user_msg(name_error, level='error'),
                dash.no_update, dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update)
    
    memo_valid, memo_error = validate_member_memo(memo)
    if not memo_valid:
        return (dash.no_update, 
                user_msg(memo_error, level='error'),
                dash.no_update, dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update)
    
    name = name.strip()
    memo = memo.strip() if memo else ''
    is_active = is_active if is_active is not None else True
    
    # 기존 데이터 로드
    if current_data is None:
        current_data = {'members': {}}
    
    if 'members' not in current_data:
        current_data['members'] = {}
    
    # 중복 확인
    if name in current_data['members']:
        return (dash.no_update, 
                user_msg(f"'{name}' 팀원이 이미 존재합니다.", level='error'),
                dash.no_update, dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update)
    
    # 새 팀원 추가
    current_data['members'][name] = {
        'name': name,
        'memo': memo,
        'is_active': is_active,
        'preferences': {},
        'created_at': datetime.now().isoformat()
    }
    
    status_text = "활성" if is_active else "휴가"
    if not isinstance(activity_log, list):
        activity_log = []
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    activity_log.append({'ts': timestamp, 'level': 'success', 'msg': f"팀원 '{name}'이(가) 추가되었습니다. (상태: {status_text})"})

    # 포지션 관리 데이터(stored-data)에도 팀원 행 추가 (기존 데이터가 있는 경우)
    updated_stored = dash.no_update
    try:
        if stored_data:
            df = parse_df(stored_data)
            if name not in df.index:
                # 모든 포지션 컬럼에 대해 0으로 초기화된 새 행 추가
                df.loc[name] = 0
                updated_stored = df.to_json(orient='split', force_ascii=False)
    except Exception as e:
        logger.warning(f"[team] stored-data 행 추가 실패: {e}")

    return (current_data,
            user_msg(f"팀원 '{name}'이(가) 성공적으로 추가되었습니다. (상태: {status_text})", level='success'),
            '',  # 이름 필드 초기화
            '',  # 메모 필드 초기화  
            True,  # 활성 상태 기본값으로 리셋
            activity_log,
            render_activity_log(activity_log),
            updated_stored)

# 팀원 삭제 콜백 (활동 로그 포함)
@app.callback(
    [Output('team-members-store', 'data', allow_duplicate=True),
     Output('add-member-status', 'children', allow_duplicate=True),
     Output('team-activity-log', 'data', allow_duplicate=True),
     Output('team-activity-log-view', 'children', allow_duplicate=True),
     Output('stored-data', 'data', allow_duplicate=True)],
    Input({'type': 'delete-member-btn', 'index': ALL}, 'n_clicks'),
    [State({'type': 'delete-member-btn', 'index': ALL}, 'id'),
     State('team-members-store', 'data'),
     State('team-activity-log', 'data'),
     State('stored-data', 'data')],
    prevent_initial_call=True
)
def delete_team_member(n_clicks_list, delete_ids, current_data, activity_log, stored_data):
    from dash import ctx
    if not ctx.triggered or not any(n_clicks_list):
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update
    
    # 어느 버튼이 클릭되었는지 확인
    button_id = ctx.triggered[0]['prop_id']
    parsed_id = safe_parse_callback_id(button_id)
    if parsed_id is None:
        return dash.no_update, user_msg("버튼 ID 파싱 오류가 발생했습니다.", level='error'), dash.no_update, render_activity_log(activity_log), dash.no_update
    member_id = parsed_id['index']
    
    if current_data is None or 'members' not in current_data:
        return dash.no_update, user_msg("삭제할 팀원 데이터가 없습니다.", level='error'), dash.no_update, render_activity_log(activity_log), dash.no_update
    
    # 멤버 존재 여부를 대소문자/공백 동일 키로 판단
    normalized_id = str(member_id).strip()
    members = current_data['members']
    if normalized_id in members:
        del members[normalized_id]
        if not isinstance(activity_log, list):
            activity_log = []
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        activity_log.append({'ts': timestamp, 'level': 'warning', 'msg': f"팀원 '{member_id}'이(가) 삭제되었습니다."})

        # stored-data(DataFrame)에서 해당 팀원 행도 제거
        updated_stored = dash.no_update
        try:
            if stored_data:
                df = parse_df(stored_data)
                if normalized_id in df.index:
                    df = df.drop(index=normalized_id)
                    updated_stored = df.to_json(orient='split', force_ascii=False)
        except Exception as e:
            logger.warning(f"[team] stored-data 행 삭제 실패: {e}")

        return current_data, user_msg(f"팀원 '{member_id}'이(가) 삭제되었습니다.", level='warning'), activity_log, render_activity_log(activity_log), updated_stored
    else:
        return dash.no_update, user_msg(f"팀원 '{member_id}'을(를) 찾을 수 없습니다.", level='error'), dash.no_update, render_activity_log(activity_log), dash.no_update

# 팀원 상태 토글 콜백
@app.callback(
    [Output('team-members-store', 'data', allow_duplicate=True),
     Output('team-status-message', 'children'),
     Output('team-activity-log', 'data', allow_duplicate=True),
     Output('team-activity-log-view', 'children', allow_duplicate=True)],
    Input({'type': 'toggle-member-status', 'index': ALL}, 'on'),
    [State({'type': 'toggle-member-status', 'index': ALL}, 'id'),
     State('team-members-store', 'data'),
     State('team-activity-log', 'data')],
    prevent_initial_call=True
)
def toggle_member_status(toggle_values, toggle_ids, current_data, activity_log):
    ctx = dash.callback_context
    if not ctx.triggered_id:
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log)
    
    # 변경된 토글 찾기
    triggered_prop = ctx.triggered[0]['prop_id']
    if '.on' not in triggered_prop:
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log)
    
    # 토글된 멤버 ID 추출
    triggered_id = ctx.triggered_id if isinstance(ctx.triggered_id, dict) else safe_parse_callback_id(triggered_prop)
    if triggered_id is None:
        return dash.no_update, user_msg("토글 ID 파싱 오류가 발생했습니다.", level='error'), dash.no_update, render_activity_log(activity_log)
    member_id = triggered_id['index']

    # 현재 스냅샷에서 해당 토글의 값을 안전하게 획득
    new_status = None
    try:
        if isinstance(toggle_ids, list) and isinstance(toggle_values, list):
            # toggle_ids 항목은 dict 형식의 패턴 ID
            for i, tid in enumerate(toggle_ids):
                if isinstance(tid, dict) and tid.get('type') == 'toggle-member-status' and tid.get('index') == member_id:
                    new_status = toggle_values[i]
                    break
    except Exception as e:
        logger.warning(f"[team] 토글 값 매핑 실패: {e}")
        new_status = ctx.triggered[0].get('value') if isinstance(ctx.triggered[0], dict) else None
    
    if new_status is None:
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log)
    
    if current_data is None or 'members' not in current_data:
        current_data = {'members': {}}
    
    if member_id not in current_data['members']:
        # 포지션 데이터 명단에서 넘어온 이름도 토글 가능하도록 자동 생성
        current_data['members'][member_id] = {
            'name': member_id,
            'memo': '',
            'is_active': True,
            'preferences': {}
        }

    # 동일 상태면 업데이트/메시지 생략하여 불필요한 재렌더 방지
    previous_status = current_data['members'][member_id].get('is_active', True)
    if previous_status == new_status:
        # 로그 뷰는 최신 로그를 그대로 유지
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log)

    current_data['members'][member_id]['is_active'] = new_status
    status_text = "활성" if new_status else "휴가"
    # 로그 데이터 축적
    if not isinstance(activity_log, list):
        activity_log = []
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    activity_log.append({'ts': timestamp, 'level': 'success', 'msg': f"팀원 '{member_id}'의 상태가 '{status_text}'로 변경되었습니다."})
    view_text = render_activity_log(activity_log)

    return (current_data,
            user_msg(f"팀원 '{member_id}'의 상태가 '{status_text}'로 변경되었습니다.", level='success'),
            activity_log,
            view_text)

# 클라이언트사이드 콜백 제거 - JavaScript 오류 방지
# 대신 서버사이드에서 처리

# MATCH 패턴 콜백들을 비활성화 - 초기 로드 시 오류 방지
# 대신 전체 팀원 목록 업데이트 방식 사용으로 실시간 반영

## 편집 모달 관련 콜백 제거됨

# 0. 다크 모드 테마 적용 콜백 (스위치 상호작용)
@app.callback(
    Output('theme-store', 'data'),
    Output('theme-trigger-store', 'data'), # 트리거 스토어 업데이트
    Input('dark-mode-switch', 'on'),
    State('theme-store', 'data'),
    prevent_initial_call=True # 초기 로드 시에는 실행하지 않음
)
def update_theme(switch_on, stored_theme):
    ctx = dash.callback_context
    # Ensure the trigger is the switch itself
    if not ctx.triggered or ctx.triggered[0]['prop_id'].split('.')[0] != 'dark-mode-switch':
        return dash.no_update, dash.no_update

    is_dark = switch_on
    theme_data = stored_theme or {'dark': False}
    theme_data['dark'] = is_dark

    # theme-store와 theme-trigger-store 모두 업데이트
    return theme_data, is_dark

# 페이지 로드 시 스위치 상태 동기화 및 초기 테마 적용
@app.callback(
    Output('dark-mode-switch', 'on', allow_duplicate=True),
    Output('theme-trigger-store', 'data', allow_duplicate=True), # 트리거 스토어 업데이트
    Input('theme-store', 'data'),
    prevent_initial_call='initial_duplicate'
)
def sync_switch_and_apply_initial_theme(stored_theme):
    is_dark = False
    if stored_theme:
        is_dark = stored_theme.get('dark', False)
    # 스위치 상태와 트리거 스토어 업데이트
    return is_dark, is_dark

# 클라이언트사이드 콜백: body 클래스 업데이트
app.clientside_callback(
    ClientsideFunction(
        namespace='clientside',
        function_name='updateBodyClass'
    ),
    Output('app-container', 'id'), # 더미 Output, 반드시 필요
    Input('theme-trigger-store', 'data')
)

# 1. JSON 업로드 처리 및 데이터 저장 콜백
@app.callback(
    [Output('stored-data', 'data', allow_duplicate=True),
     Output('absence-data', 'data', allow_duplicate=True),
     Output('team-members-store', 'data', allow_duplicate=True),
     Output('integrated-upload-status', 'children')],
    Input('upload-integrated-data', 'contents'),
    State('upload-integrated-data', 'filename'),
    prevent_initial_call=True
)
def update_integrated_data(contents, filename):
    logger.info("[upload] 통합 JSON 업로드 콜백 호출")
    logger.debug(f"[upload] contents is None: {contents is None}")
    logger.debug(f"[upload] filename: {filename}")
    logger.debug(f"[upload] contents type: {type(contents)}")
    
    if contents is None:
        logger.info("[upload] 파일 미선택 또는 업로드 취소")
        return dash.no_update, dash.no_update, dash.no_update, dash.no_update
    
    try:
        logger.info(f"[upload] 파일 처리 시작 - filename: {filename}")
        content_type, content_string = contents.split(',')
        decoded = base64.b64decode(content_string)
        logger.debug(f"[upload] 파일 디코딩 완료 - 크기: {len(decoded)} bytes")
        
        if isinstance(filename, str) and filename.lower().endswith('.json'):
            logger.debug("[upload] JSON 파일로 인식됨")
            # 통합 JSON 파일 처리
            integrated_data = json.loads(decoded.decode('utf-8'))
            logger.debug(f"[upload] JSON 파싱 완료 - 키: {list(integrated_data.keys())}")
            
            # 데이터 구조 검증
            if "team_data" not in integrated_data:
                raise ValueError("유효하지 않은 통합 JSON 형식입니다. 'team_data' 필드가 필요합니다.")
            
            # 팀원 데이터 추출 및 변환
            team_data = integrated_data["team_data"]
            logger.debug(f"[upload] 팀원 데이터 키: {list(team_data.keys())}")
            
            if "data" in team_data and "members" in team_data and "positions" in team_data:
                logger.debug("[upload] 팀원 데이터 구조 검증 통과")
                # DataFrame으로 변환
                df = pd.DataFrame(team_data["data"]).T
                # 인덱스 이름은 고정 라벨 사용 (데이터에 의존하지 않음)
                df.index.name = "팀원"
                team_json = df.to_json(orient='split', force_ascii=False)
                logger.debug(f"[upload] DataFrame 변환 완료 - shape: {df.shape}")
            else:
                raise ValueError("팀원 데이터 구조가 올바르지 않습니다.")
            
            # 불참자 데이터 추출
            absence_data = integrated_data.get("absence_data", {"dates": {}})

            # 팀원 메타 복구
            restored_team_members = dash.no_update
            try:
                members_meta = integrated_data.get("members_meta")
                if isinstance(members_meta, dict):
                    restored_team_members = {"members": {}}
                    for member_name in team_data.get("members", []):
                        meta = members_meta.get(member_name, {}) if isinstance(members_meta.get(member_name, {}), dict) else {}
                        restored_team_members["members"][member_name] = {
                            "name": member_name,
                            "memo": meta.get("memo", ""),
                            "is_active": meta.get("is_active", True),
                            "preferences": meta.get("preferences", {})
                        }
            except Exception as e:
                logger.warning(f"[upload] members_meta 복구 실패: {e}")
            
            # 통계 정보 계산
            total_members = len(team_data.get("members", []))
            total_absences = sum(calculate_total_absences(absence_data).values()) if absence_data else 0
            logger.info(f"[upload] 통계 계산 - 팀원 {total_members}명, 불참 {total_absences}건")
            
            success_message = user_msg(
                f"통합 JSON '{filename}' 업로드 완료! (팀원 {total_members}명, 불참 기록 {total_absences}건)",
                level='success'
            )
            
            logger.info("[upload] 업로드 성공 - 데이터 반환")
            return team_json, absence_data, restored_team_members, success_message
        else:
            return dash.no_update, dash.no_update, dash.no_update, user_msg(
                f"지원되지 않는 파일 형식입니다: {filename}. JSON 파일만 가능합니다.",
                level='error'
            )
        
    except Exception as e:
        logger.exception(f"[upload] 통합 JSON 업로드 오류: {e}")
        error_message = user_msg(
            f"통합 JSON 업로드 오류: {e}",
            level='error'
        )
        return dash.no_update, dash.no_update, dash.no_update, error_message

# 2. 저장된 데이터 기반 테이블 생성/업데이트 콜백 (수정: 테마 반영)
@app.callback(Output('output-data-table', 'children'),
              Input('stored-data', 'data'),
              Input('theme-store', 'data')) # 테마 변경 시 테이블 다시 그림
def update_data_table(jsonified_cleaned_data, theme_data):
    from dash import ctx
    
    if jsonified_cleaned_data is None:
        return html.P("데이터가 없습니다. 파일을 업로드해주세요.")

    # 테마 변경 시에는 데이터 재계산 생략하고 스타일만 업데이트
    if ctx.triggered_id == 'theme-store' and jsonified_cleaned_data:
        try:
            # 기존 데이터를 재사용하여 스타일만 업데이트
            df = parse_df(jsonified_cleaned_data)
            df_display = df.astype(str).replace('nan', '')
            
            colors = get_theme_colors(theme_data)
            return create_table_with_theme(df_display, df, jsonified_cleaned_data, colors)
        except Exception as e:
            logger.warning(f"[table] 테마 전용 업데이트 실패, 전체 재계산: {e}")

    try:
        df = parse_df(jsonified_cleaned_data)
        df_display = df.astype(str).replace('nan', '')  # 복사 제거, 직접 변환

        colors = get_theme_colors(theme_data)
        return create_table_with_theme(df_display, df, jsonified_cleaned_data, colors)
    except ValueError as e:
         logger.exception(f"[table] Error reading json data for table: {e}")
         return html.P(f"테이블 생성 오류: {e}")
    except Exception as e:
        logger.exception(f"[table] Unexpected error creating table: {e}")
        return html.P("테이블을 표시하는 중 예상치 못한 오류가 발생했습니다.")

# 3. 정적 시각화 생성/업데이트 콜백 (Treemap, Box, Heatmaps)
@app.callback(
    Output('static-visualizations-container', 'children'), # 출력 변경
    Input('stored-data', 'data'),
    Input('theme-store', 'data'),
    Input('team-members-store', 'data')  # 휴가 인원 필터링을 위해 추가
    # Radar Dropdown Input 제거됨
)
def update_static_visualizations(jsonified_data, theme_data, team_members_data): # 함수명 및 인자 변경
    if jsonified_data is None:
        return []

    colors = get_theme_colors(theme_data)
    is_dark = colors['is_dark']
    plotly_template = colors['plotly_template']

    try:
        # 데이터 파싱 (한 번만 수행)
        df = parse_df(jsonified_data)
        df_numeric = get_numeric_df(jsonified_data).fillna(0)

        if df_numeric.empty:
            return html.P("시각화할 숫자 데이터가 없습니다.")

        # 휴가 중인 인원 필터링
        all_members = df_numeric.index.tolist()
        active_members = get_active_members(all_members, team_members_data)
        if not active_members:
            return html.P("시각화할 활성 팀원 데이터가 없습니다.")
        
        df_numeric = df_numeric.loc[active_members]

        figures = []
        
        # 색상 팔레트 사전 계산 (재사용)
        optimized_treemap_colors = get_color_for_chart_type('treemap')
        optimized_heatmap_colors = get_color_for_chart_type('heatmap')
        optimized_deviation_colors = get_color_for_chart_type('heatmap_deviation')

        # --- Treemap 생성 로직 ---
        member_totals = df_numeric.sum(axis=1)
        df_member_totals = member_totals[member_totals > 0].reset_index()
        df_member_totals.columns = ['팀원', '총 횟수']
        
        if not df_member_totals.empty:
            fig_member_load = px.treemap(df_member_totals, path=['팀원'], values='총 횟수', title="팀원별 총 업무량 비율 (Treemap)",
                                     color='총 횟수', color_continuous_scale=optimized_treemap_colors, template=plotly_template)
            fig_member_load.update_traces(textfont_size=16, textinfo="label+value")
            fig_member_load = style_figure(fig_member_load, plotly_template, height=400)
            fig_member_load = enhance_chart_accessibility(fig_member_load, 'treemap')
            figures.append(html.Div(className='card', children=[dcc.Graph(figure=fig_member_load)]))

        # --- Box Plot 생성 로직 ---
        original_index_name = df_numeric.index.name or 'index'
        df_reset = df_numeric.reset_index()
        df_melted_for_box = df_reset.melt(id_vars=original_index_name, var_name='Position', value_name='Count')
        
        sw_col_name = SW_COLUMN_NAME
        if sw_col_name in df_numeric.columns:
            df_melted_filtered = df_melted_for_box[~((df_melted_for_box['Position'] == sw_col_name) & (df_melted_for_box['Count'] <= 0))]
            plot_title_box = "포지션별 수행 횟수 분포 (Box Plot, SW는 0값 제외)"
        else:
            df_melted_filtered = df_melted_for_box
            plot_title_box = "포지션별 수행 횟수 분포 (Box Plot)"

        if not df_melted_filtered.empty:
            num_positions = df_melted_filtered['Position'].nunique()
            optimized_boxplot_colors = get_color_for_chart_type('boxplot', num_positions)
            # 박스(사분위) + 이상치만 표시
            fig_box_only_outliers = px.box(
                df_melted_filtered,
                x='Position',
                y='Count',
                points='outliers',
                title=plot_title_box,
                labels={'Position': '포지션', 'Count': '횟수', original_index_name: '팀원'},
                hover_data=[original_index_name],
                template=plotly_template,
                color='Position',
                color_discrete_sequence=optimized_boxplot_colors
            )
            # 이상치 마커 차별화
            fig_box_only_outliers.update_traces(
                boxpoints='outliers',
                marker=dict(symbol='x', size=9, opacity=1.0, line=dict(width=1)),
                hovertemplate=("팀원(이상치): %{customdata[0]}<br>횟수: %{y:.0f}<br><extra></extra>")
            )
            # 지터 점(전체 데이터) 오버레이, 투명도 40~60%
            fig_strip = px.strip(
                df_melted_filtered,
                x='Position',
                y='Count',
                color='Position',
                hover_data=[original_index_name],
                template=plotly_template,
                color_discrete_sequence=optimized_boxplot_colors
            )
            fig_strip.update_traces(
                jitter=0.35,
                opacity=0.5,
                marker=dict(size=6),
                showlegend=False,
                hovertemplate=("팀원: %{customdata[0]}<br>횟수: %{y:.0f}<br><extra></extra>")
            )
            # 결합: 지터 먼저, 박스(이상치 포함) 위에
            fig_pos_distribution = go.Figure(data=list(fig_strip.data) + list(fig_box_only_outliers.data))
            fig_pos_distribution.update_layout(title=plot_title_box, template=plotly_template)
            fig_pos_distribution.update_yaxes(rangemode='tozero')
            fig_pos_distribution = style_figure(fig_pos_distribution, plotly_template, height=350)
            fig_pos_distribution = enhance_chart_accessibility(fig_pos_distribution, 'boxplot')
            figures.append(html.Div(className='card', children=[dcc.Graph(figure=fig_pos_distribution)]))

        # --- Heatmap 생성 로직 ---
        line_color = "rgba(100, 100, 100, 0.7)" if is_dark else "rgba(200, 200, 200, 0.7)"
        num_rows = len(df_numeric.index)
        num_cols = len(df_numeric.columns)
        use_text = num_rows <= 30 and num_cols <= 20
        
        if use_text:
            fig_heatmap = px.imshow(df_numeric, text_auto=True, aspect="auto", title="팀원-포지션별 수행 횟수 Heatmap",
                                    labels=dict(x="포지션", y="팀원", color="횟수"), color_continuous_scale=optimized_heatmap_colors, template=plotly_template)
            fig_heatmap.update_traces(textfont_size=12)
        else:
            fig_heatmap = go.Figure(data=go.Heatmap(
                z=df_numeric.values,
                x=df_numeric.columns.tolist(),
                y=[str(y) if pd.notna(y) else "Unknown" for y in df_numeric.index.tolist()],
                colorscale=optimized_heatmap_colors,
                colorbar=dict(title='횟수')
            ))
            fig_heatmap.update_layout(title="팀원-포지션별 수행 횟수 Heatmap", template=plotly_template)
        
        fig_heatmap.update_xaxes(side="bottom")
        
        # Shape 추가 최적화 (리스트 컴프리헨션으로 한 번에 처리)
        if num_rows > 1:
            shapes = [
                dict(type='line', x0=-0.5, y0=i + 0.5, x1=num_cols - 0.5, y1=i + 0.5, 
                     line=dict(color=line_color, width=1))
                for i in range(num_rows - 1)
            ]
            fig_heatmap.update_layout(shapes=shapes)
        
        pixels_per_row = 45
        dynamic_height = max(400, min(1500, num_rows * pixels_per_row))
        cleaned_y_labels = [str(label) if pd.notna(label) else "Unknown" for label in df_numeric.index.tolist()]
        fig_heatmap.update_layout(height=dynamic_height, yaxis_range=[-0.5, num_rows - 0.5],
                                yaxis=dict(tickmode='array', tickvals=list(range(num_rows)), ticktext=cleaned_y_labels, automargin=True))
        fig_heatmap = style_figure(fig_heatmap, plotly_template, height=dynamic_height)
        fig_heatmap = enhance_chart_accessibility(fig_heatmap, 'heatmap')
        figures.append(html.Div(className='card', children=[dcc.Graph(figure=fig_heatmap)]))

        # --- Deviation Heatmap 생성 로직 ---
        if num_rows > 1:
            df_deviation = df_numeric.sub(df_numeric.mean(axis=0), axis=1)
            df_text_annotations = df_deviation.round(1).astype(str)
            plot_title_dev = "팀원-포지션별 평균 대비 편차"
            # 발산 팔레트 기준선(0) 중앙 정렬을 위해 대칭 범위 설정
            try:
                max_abs = float(np.nanmax(np.abs(df_deviation.values)))
            except Exception:
                max_abs = 0.0
            
            if sw_col_name in df_numeric.columns:
                sw_performers_mask = df_numeric[sw_col_name] > 0
                if sw_performers_mask.any():
                    sw_mean_filtered = df_numeric.loc[sw_performers_mask, sw_col_name].mean()
                    df_deviation.loc[sw_performers_mask, sw_col_name] = df_numeric.loc[sw_performers_mask, sw_col_name] - sw_mean_filtered
                    df_deviation.loc[~sw_performers_mask, sw_col_name] = np.nan
                    df_text_annotations.loc[~sw_performers_mask, sw_col_name] = '-'
                    df_text_annotations.loc[sw_performers_mask, sw_col_name] = df_deviation.loc[sw_performers_mask, sw_col_name].round(1).astype(str)
                    plot_title_dev = "팀원-포지션별 평균 대비 편차 (SW는 >0 평균 기준, 0은 '-' 표시)"
                else:
                    df_deviation[sw_col_name] = np.nan
                    df_text_annotations[sw_col_name] = '-'
                    plot_title_dev = "팀원-포지션별 평균 대비 편차 (SW 수행자 없음)"

            use_text_dev = num_rows <= 30 and num_cols <= 20
            if use_text_dev:
                fig_deviation_heatmap = px.imshow(
                    df_deviation, aspect="auto", title=plot_title_dev,
                    labels=dict(x="포지션", y="팀원", color="편차"),
                    color_continuous_scale=optimized_deviation_colors,
                    color_continuous_midpoint=0,
                    zmin=-max_abs, zmax=max_abs,
                    template=plotly_template
                )
                fig_deviation_heatmap.update_traces(text=df_text_annotations.values, texttemplate="%{text}", textfont_size=12)
                # 범례(색상바) 설명 강화: + 과다 / – 부족
                fig_deviation_heatmap.update_coloraxes(colorbar_title_text='편차 (+ 과다 / – 부족)')
            else:
                fig_deviation_heatmap = go.Figure(data=go.Heatmap(
                    z=df_deviation.values,
                    x=df_deviation.columns.tolist(),
                    y=[str(y) if pd.notna(y) else "Unknown" for y in df_deviation.index.tolist()],
                    colorscale=optimized_deviation_colors,
                    zmid=0,
                    zmin=-max_abs, zmax=max_abs,
                    colorbar=dict(title='편차 (+ 과다 / – 부족)')
                ))
                fig_deviation_heatmap.update_layout(title=plot_title_dev, template=plotly_template)
                fig_deviation_heatmap.update_xaxes(side="bottom")
                fig_deviation_heatmap.update_layout(height=dynamic_height, yaxis_range=[-0.5, num_rows - 0.5],
                                                    yaxis=dict(tickmode='array', tickvals=list(range(num_rows)), ticktext=cleaned_y_labels, automargin=True))
            
            fig_deviation_heatmap = style_figure(fig_deviation_heatmap, plotly_template, height=dynamic_height)
            fig_deviation_heatmap = enhance_chart_accessibility(fig_deviation_heatmap, 'heatmap_deviation')
            figures.append(html.Div(className='card', children=[dcc.Graph(figure=fig_deviation_heatmap)]))

        return figures # Treemap, Box, Heatmaps 리스트 반환

    except Exception as e:
        logger.exception(f"[viz] Error generating static visualizations: {e}")
        return html.P(f"정적 시각화 생성 중 오류 발생: {e}")

# --- 새로 추가된 콜백들 --- #

# 4. 테이블 편집 내용 반영 콜백 (변경 없음)
@app.callback(
    Output('stored-data', 'data', allow_duplicate=True),
    Input('editable-table', 'data'),
    State('editable-table', 'columns'),
    prevent_initial_call=True # 앱 로드 시 초기 테이블 데이터로 store를 덮어쓰지 않도록 방지
)
def update_store_from_table(rows, columns):
    if rows is None:
        return dash.no_update

    # 테이블 데이터를 다시 pandas DataFrame으로 변환
    # 인덱스 컬럼명을 동적으로 찾기 (보통 첫 번째 컬럼)
    index_col_name = columns[0]['id'] if columns else None

    df = pd.DataFrame(rows, columns=[c['id'] for c in columns])

    # 주석 필터링 다시 적용 (편집 중 주석 문자열 입력 방지 또는 처리)
    comment_patterns = [r'^#', r'^도와주는것도.*']
    def filter_comments(cell_value):
        if pd.isna(cell_value) or cell_value == '': return pd.NA
        cell_str = str(cell_value)
        for pattern in comment_patterns:
            if re.match(pattern, cell_str): return pd.NA
        try: return pd.to_numeric(cell_str)
        except ValueError: return cell_str

    # 인덱스 컬럼 제외하고 필터링 적용
    cols_to_filter = [col for col in df.columns if col != index_col_name]
    for col in cols_to_filter:
        df[col] = df[col].apply(filter_comments)

    # 인덱스 설정
    if index_col_name and index_col_name in df.columns:
        try:
            df.set_index(index_col_name, inplace=True)
        except KeyError:
            logger.warning(f"[table] Could not set index '{index_col_name}' during table update.")

    return df.to_json(date_format='iso', orient='split', force_ascii=False)

# 5. 통합 JSON 저장 관련 콜백들

# 통합 JSON 저장 콜백
@app.callback(
    Output("download-integrated-json", "data"),
    Input("save-integrated-button", "n_clicks"),
    State("stored-data", "data"),
    State("absence-data", "data"),
    State("team-members-store", "data"),
    prevent_initial_call=True,
)
def save_integrated_json(n_clicks, team_data, absence_data, team_members_data):
    if n_clicks > 0 and team_data is not None:
        try:
            # 팀원 데이터 파싱
            df = parse_df(team_data)
            
            # 팀원 메타 병합 준비
            members_meta = {}
            if isinstance(team_members_data, dict) and 'members' in team_members_data and isinstance(team_members_data['members'], dict):
                for member_name, m in team_members_data['members'].items():
                    if isinstance(m, dict):
                        members_meta[member_name] = {
                            'memo': m.get('memo', ''),
                            'is_active': m.get('is_active', True),
                            'preferences': m.get('preferences', {})
                        }

            # 통합 JSON 구조 생성
            integrated_data = {
                "metadata": {
                    "version": "1.0",
                    "created_at": datetime.now().isoformat(),
                    "description": "포지션 배정 도우미 통합 데이터"
                },
                "team_data": {
                    "members": df.index.tolist(),
                    "positions": df.columns.tolist(),
                    "data": df.to_dict('index')
                },
                "absence_data": absence_data if absence_data else {"dates": {}},
                "members_meta": members_meta
            }
            
            json_string = json.dumps(integrated_data, indent=4, ensure_ascii=False)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return dict(content=json_string, filename=f"integrated_position_data_{timestamp}.json")
        except Exception as e:
            print(f"Error preparing integrated JSON for download: {e}")
            return dash.no_update
    return dash.no_update

# 통합 JSON 저장 상태 업데이트 콜백
@app.callback(
    Output("save-status", "children"),
    Input("download-integrated-json", "data"),
    prevent_initial_call=True,
)
def update_integrated_save_status(download_data):
    if download_data:
        timestamp = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        return html.Span(f"통합 JSON 파일 저장 완료! ({timestamp})", className='success-message', style={'marginLeft': '10px'})
    return ""



# --- 불참자 관리 관련 콜백 --- #

# 7. 배정 데이터에서 팀원 목록 가져와 불참자 선택 드롭다운 갱신 (활성 팀원만 표시)
@app.callback(
    Output('absence-member-dropdown', 'options'),
    Input('stored-data', 'data'),
    Input('team-members-store', 'data')  # 휴가 인원 필터링을 위해 추가
)
def update_absence_member_dropdown(jsonified_data, team_members_data):
    if jsonified_data is None:
        return []
    
    try:
        df = parse_df(jsonified_data)
        all_members = df.index.tolist()
        # 휴가 중인 인원 필터링
        active_members = get_active_members(all_members, team_members_data)
        return [{'label': m, 'value': m} for m in active_members]
    except Exception as e:
        logger.exception(f"[absence] 불참자 드롭다운 업데이트 오류: {e}")
        return []

# 8. 불참자 추가 콜백
@app.callback(
    [Output('absence-data', 'data'),
     Output('absence-add-status', 'children')],
    Input('add-absence-button', 'n_clicks'),
    State('absence-date-picker', 'date'),
    State('absence-member-dropdown', 'value'),
    State('absence-reason-input', 'value'),
    State('absence-data', 'data'),
    prevent_initial_call=True
)
def add_absence_record(n_clicks, date_value, member, reason, absence_data):
    if not n_clicks or not date_value or not member:
        return dash.no_update, dash.no_update
    
    try:
        # 초기 데이터 구조 생성
        if absence_data is None:
            absence_data = {
                "dates": {}
            }
        
        # 날짜 데이터 가져오기 (없으면 새로 생성)
        if "dates" not in absence_data:
            absence_data["dates"] = {}
        
        # 해당 날짜의 불참 기록 가져오기 (없으면 새로 생성)
        if date_value not in absence_data["dates"]:
            absence_data["dates"][date_value] = {
                "absent_members": [],
                "notes": {}
            }
        
        # 이미 불참 기록이 있는지 확인
        if member in absence_data["dates"][date_value]["absent_members"]:
            # 기존 기록 업데이트 (사유만 변경)
            if reason:
                absence_data["dates"][date_value]["notes"][member] = reason
            message = html.Span(f"팀원 '{member}'는 이미 {date_value}에 불참으로 등록되어 있습니다. 사유가 업데이트되었습니다.", className='warning-message')
        else:
            # 새 불참 기록 추가
            absence_data["dates"][date_value]["absent_members"].append(member)
            if reason:
                absence_data["dates"][date_value]["notes"][member] = reason
            
            message = html.Span(f"팀원 '{member}'가 {date_value}에 불참으로 등록되었습니다.", className='success-message')
        
        return absence_data, message
    
    except Exception as e:
        logger.exception(f"[absence] 불참자 추가 오류: {e}")
        return dash.no_update, user_msg(f"오류 발생: {e}", level='error')


# 10. 불참자 데이터 초기화 콜백 (통합 JSON과 연동)
@app.callback(
    [Output('absence-data', 'data', allow_duplicate=True),
     Output('absence-save-status', 'children', allow_duplicate=True),
     Output('stored-data', 'data', allow_duplicate=True)],
    Input('reset-absence-button', 'n_clicks'),
    State('stored-data', 'data'),
    prevent_initial_call=True
)
def reset_absence_data(n_clicks, stored_data):
    if n_clicks > 0:
        empty_data = {
            "dates": {}
        }
        
        # 통합 JSON에서도 불참 데이터 제거
        updated_stored = dash.no_update
        if stored_data:
            try:
                # 통합 JSON 구조 확인 및 불참 데이터 제거
                integrated_data = json.loads(stored_data)
                if 'absence_data' in integrated_data:
                    integrated_data['absence_data'] = empty_data
                    updated_stored = json.dumps(integrated_data, ensure_ascii=False, indent=2)
            except Exception as e:
                logger.warning(f"[absence] 통합 JSON 업데이트 실패: {e}")
        
        return empty_data, user_msg("불참 데이터가 초기화되었습니다.", level='warning'), updated_stored
    return dash.no_update, dash.no_update, dash.no_update

# 11. 불참자 현황 테이블 업데이트 콜백
@app.callback(
    Output('absence-table-container', 'children'),
    Input('absence-data', 'data'),
    Input('theme-store', 'data')
)
def update_absence_table(absence_data, theme_data):
    if absence_data is None or "dates" not in absence_data or not absence_data["dates"]:
        return html.P("등록된 불참 기록이 없습니다.")
    
    colors = get_theme_colors(theme_data)
    base_bg = colors['base_bg']
    default_text_color = colors['default_text_color']
    header_bg = colors['header_bg']
    border_color = colors['border_color']
    
    try:
        # 테이블 데이터 생성
        table_data = []
        
        for date, info in sorted(absence_data["dates"].items(), reverse=True):
            for member in info["absent_members"]:
                reason = info["notes"].get(member, "-")
                table_data.append({
                    "날짜": date,
                    "팀원": member,
                    "사유": reason
                })
        
        if not table_data:
            return html.P("등록된 불참 기록이 없습니다.")
        
        # 테이블 스타일 설정
        style_cell = {
            'textAlign': 'left', 
            'padding': '10px 15px', 
            'backgroundColor': base_bg, 
            'color': default_text_color,
            'border': f'1px solid {border_color}',
            'fontWeight': '500',
            'fontSize': '15px'
        }
        
        style_header = {
            'backgroundColor': header_bg, 
            'color': default_text_color, 
            'fontWeight': '600',
            'textAlign': 'left', 
            'padding': '12px 15px', 
            'border': f'1px solid {border_color}',
            'fontSize': '16px'
        }
        
        return dash_table.DataTable(
            id='absence-table',
            columns=[
                {"name": "날짜", "id": "날짜"},
                {"name": "팀원", "id": "팀원"},
                {"name": "사유", "id": "사유"},
            ],
            data=table_data,
            style_table={'border': f'1px solid {border_color}'},
            style_cell=style_cell,
            style_header=style_header,
            page_action="native",
            page_size=5,
            sort_action="native",
            sort_mode="multi",
            sort_by=[{"column_id": "날짜", "direction": "desc"}]
        )
    
    except Exception as e:
        logger.exception(f"[absence] 불참자 테이블 업데이트 오류: {e}")
        return html.P(f"불참자 현황 테이블 생성 오류: {e}")

# 12. 불참 통계 요약 및 시각화 콜백
@app.callback(
    [Output('absence-stats-container', 'children'),
     Output('absence-visualizations-container', 'children')],
    Input('absence-data', 'data'),
    Input('theme-store', 'data')
)
def update_absence_stats_and_viz(absence_data, theme_data):
    # 총 불참 횟수 계산 
    total_absences = calculate_total_absences(absence_data)
    
    if not total_absences:
        return html.P("불참 통계 데이터가 없습니다."), []
    
    colors = get_theme_colors(theme_data)
    plotly_template = colors['plotly_template']
    base_bg = colors['base_bg']
    default_text_color = colors['default_text_color']
    header_bg = colors['header_bg']
    border_color = colors['border_color']
    
    try:
        # 불참 통계 데이터 가공
        absence_counts = pd.Series(total_absences).sort_values(ascending=False)
        
        # 테이블 스타일 설정
        style_cell = {
            'textAlign': 'left', 
            'padding': '10px 15px', 
            'backgroundColor': base_bg, 
            'color': default_text_color,
            'border': f'1px solid {border_color}',
            'fontWeight': '500',
            'fontSize': '15px'
        }
        
        style_header = {
            'backgroundColor': header_bg, 
            'color': default_text_color, 
            'fontWeight': '600',
            'textAlign': 'left', 
            'padding': '12px 15px', 
            'border': f'1px solid {border_color}',
            'fontSize': '16px'
        }
        
        # 통계 테이블 데이터 생성
        stats_data = [{"팀원": member, "불참 횟수": count} for member, count in absence_counts.items()]
        
        # 통계 테이블 생성
        stats_table = dash_table.DataTable(
            id='absence-stats-table',
            columns=[
                {"name": "팀원", "id": "팀원"},
                {"name": "불참 횟수", "id": "불참 횟수"},
            ],
            data=stats_data,
            style_table={'border': f'1px solid {border_color}'},
            style_cell=style_cell,
            style_header=style_header,
            sort_action="native",
            sort_mode="multi",
            sort_by=[{"column_id": "불참 횟수", "direction": "desc"}]
        )
        
        # 시각화 섹션 - 계층화된 구조로 재구성 (개별 분석 / 시계열 분석)
        viz_content = html.Div(children=[
            # 1단계: 개별 분석 (팀원별)
            html.Div([
                html.H5("📊 개별 분석", style={
                    'marginTop': '20px', 'marginBottom': '15px', 
                    'fontSize': '18px', 'fontWeight': 'bold',
                    'color': default_text_color, 'borderBottom': f'2px solid {border_color}',
                    'paddingBottom': '8px'
                }),
                html.Div(style={
                    'display': 'grid', 
                    'gridTemplateColumns': '1fr 1fr',
                    'gap': '20px', 
                    'marginBottom': '30px'
                }, children=[
                    # 팀원별 불참 횟수 (바 차트)
                    html.Div(className='viz-compact-card', style={
                        'border': f'2px solid {border_color}', 
                        'borderRadius': '12px', 
                        'padding': '20px', 
                        'backgroundColor': base_bg,
                        'minHeight': '450px',
                        'boxSizing': 'border-box',
                        'boxShadow': f'0 4px 8px rgba(0,0,0,0.1)'
                    }, children=[
                        html.H6("팀원별 불참 횟수", style={
                            'marginTop': '0', 'marginBottom': '20px', 
                            'textAlign': 'center', 'fontSize': '18px', 'fontWeight': 'bold',
                            'color': default_text_color
                        }),
                        dcc.Graph(
                            id='absence-bar-chart',
                            figure=create_absence_bar_chart(absence_counts, plotly_template),
                            style={'height': '380px', 'width': '100%'},
                            config={'responsive': True, 'displayModeBar': False}
                        )
                    ]),
                    
                    # 팀원별 불참 비율 (파이 차트)
                    html.Div(className='viz-compact-card', style={
                        'border': f'2px solid {border_color}', 
                        'borderRadius': '12px', 
                        'padding': '20px', 
                        'backgroundColor': base_bg,
                        'minHeight': '450px',
                        'boxSizing': 'border-box',
                        'boxShadow': f'0 4px 8px rgba(0,0,0,0.1)'
                    }, children=[
                        html.H6("팀원별 불참 비율", style={
                            'marginTop': '0', 'marginBottom': '20px', 
                            'textAlign': 'center', 'fontSize': '18px', 'fontWeight': 'bold',
                            'color': default_text_color
                        }),
                        dcc.Graph(
                            id='absence-pie-chart',
                            figure=create_absence_pie_chart(absence_counts, plotly_template),
                            style={'height': '380px', 'width': '100%'},
                            config={'responsive': True, 'displayModeBar': False}
                        )
                    ])
                ])
            ]),
            
            # 2단계: 시계열 분석 (시간별)
            html.Div([
                html.H5("📈 시계열 분석", style={
                    'marginTop': '30px', 'marginBottom': '15px', 
                    'fontSize': '18px', 'fontWeight': 'bold',
                    'color': default_text_color, 'borderBottom': f'2px solid {border_color}',
                    'paddingBottom': '8px'
                }),
                html.Div(style={
                    'display': 'grid', 
                    'gridTemplateColumns': '1fr 1fr',
                    'gap': '20px'
                }, children=[
                    # 날짜별 불참자 수 추이 (라인 차트)
                    html.Div(className='viz-compact-card', style={
                        'border': f'2px solid {border_color}', 
                        'borderRadius': '12px', 
                        'padding': '20px', 
                        'backgroundColor': base_bg,
                        'minHeight': '450px',
                        'boxSizing': 'border-box',
                        'boxShadow': f'0 4px 8px rgba(0,0,0,0.1)'
                    }, children=[
                        html.H6("날짜별 불참자 수 추이", style={
                            'marginTop': '0', 'marginBottom': '20px', 
                            'textAlign': 'center', 'fontSize': '18px', 'fontWeight': 'bold',
                            'color': default_text_color
                        }),
                        dcc.Graph(
                            id='absence-line-chart',
                            figure=create_absence_line_chart(absence_data, plotly_template),
                            style={'height': '380px', 'width': '100%'},
                            config={'responsive': True, 'displayModeBar': False}
                        )
                    ]) if "dates" in absence_data and absence_data["dates"] else html.Div(style={'display': 'none'}),
                    
                    # 월별 불참 추이 (바 차트)
                    html.Div(className='viz-compact-card', style={
                        'border': f'2px solid {border_color}', 
                        'borderRadius': '12px', 
                        'padding': '20px', 
                        'backgroundColor': base_bg,
                        'minHeight': '450px',
                        'boxSizing': 'border-box',
                        'boxShadow': f'0 4px 8px rgba(0,0,0,0.1)'
                    }, children=[
                        html.H6("월별 불참 추이", style={
                            'marginTop': '0', 'marginBottom': '20px', 
                            'textAlign': 'center', 'fontSize': '18px', 'fontWeight': 'bold',
                            'color': default_text_color
                        }),
                        dcc.Graph(
                            id='monthly-absence-chart',
                            figure=create_monthly_absence_chart(absence_data, plotly_template),
                            style={'height': '380px', 'width': '100%'},
                            config={'responsive': True, 'displayModeBar': False}
                        )
                    ]) if "dates" in absence_data and absence_data["dates"] else html.Div(style={'display': 'none'})
                ])
            ])
        ])
        
        # 전체 시각화 섹션 구성 (버튼 없이 바로 컨텐츠 노출)
        return stats_table, viz_content
    
    except Exception as e:
        logger.exception(f"[absence] 불참 통계 업데이트 오류: {e}")
        return html.P(f"불참 통계 생성 오류: {e}"), []

# 불참 통계 바 차트 생성 함수 추가
def create_absence_bar_chart(absence_counts, template):
    """팀원별 불참 횟수 수평 바 차트 생성 - 성능 최적화"""
    # 템플릿 안전성 검사
    if not isinstance(template, str):
        template = "plotly_white"
    
    try:
        # absence_counts가 None이거나 비어있는지 안전하게 체크 (dict 또는 Series 모두 처리)
        if absence_counts is None:
            return px.bar(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
        
        # pandas Series인 경우 dict로 변환
        if isinstance(absence_counts, pd.Series):
            absence_counts = absence_counts.to_dict()
        
        # dict인 경우 길이 체크
        if not isinstance(absence_counts, dict) or len(absence_counts) == 0:
            return px.bar(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
        
        # 최적화된 데이터 처리
        df_absence = pd.DataFrame(list(absence_counts.items()), columns=['팀원', '불참 횟수'])
        total_absences = df_absence['불참 횟수'].sum()
        mean_absences = df_absence['불참 횟수'].mean()
        
        # 데이터 정렬 (높은 순으로)
        df_absence = df_absence.sort_values('불참 횟수', ascending=True)
        
        # 색상 팔레트 사전 계산
        optimized_colors = get_optimized_color_palettes()
        color_scale = optimized_colors['sequential_viridis'][:6]
        
        # 최적화된 수평 바 차트 생성
        fig = px.bar(
            df_absence, 
            x='불참 횟수',
            y='팀원',
            orientation='h',
            color='불참 횟수',
            color_continuous_scale=color_scale,
            title=f"팀원별 불참 횟수 (총 {total_absences}회, 평균 {mean_absences:.1f}회)",
            template=template
        )
        
        # 평균선 추가
        fig.add_vline(
            x=mean_absences, 
            line_dash="dash", 
            line_color="orange",
            annotation_text=f"평균: {mean_absences:.1f}회",
            annotation_position="top right"
        )
        
        # 최적화된 스타일 적용
        fig = style_figure(fig, template, height=max(300, len(df_absence) * 25))
        fig = enhance_chart_accessibility(fig, 'bar')
        fig.update_xaxes(title_text="불참 횟수")
        fig.update_yaxes(title_text="팀원")
        fig.update_traces(
            texttemplate='%{x}회', 
            textposition='auto',
            hovertemplate='<b>%{y}</b><br>불참 횟수: %{x}회<extra></extra>'
        )
        
        return fig
        
    except Exception as e:
        logger.exception(f"[absence] 수평 바 차트 생성 오류: {e}")
        return px.bar(template=template).update_layout(
            annotations=[dict(text="차트 생성 오류", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
        )

# 불참 통계 라인 차트 생성 함수 추가
def create_absence_line_chart(absence_data, template):
    """날짜별 불참자 수 추이 영역 차트 생성 - 성능 최적화"""
    try:
        # 템플릿 안전성 검사
        if not isinstance(template, str):
            template = "plotly_white"
            
        if "dates" not in absence_data or not absence_data["dates"]:
            return px.area(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
    
        # 최적화된 데이터 처리 (복잡한 통계 계산 제거)
        date_counts = {date: len(info["absent_members"]) for date, info in absence_data["dates"].items()}
        df_date_counts = pd.DataFrame(list(date_counts.items()), columns=['날짜', '불참자 수'])
        
        # 날짜 형식 변환 및 정렬
        df_date_counts['날짜'] = pd.to_datetime(df_date_counts['날짜'])
        df_date_counts = df_date_counts.sort_values(by='날짜')
        
        # 기본 통계만 계산
        total_days = len(df_date_counts)
        mean_absence = df_date_counts['불참자 수'].mean()
        
        # 최적화된 영역 차트 생성 (라인 차트보다 빠른 렌더링)
        optimized_colors = get_optimized_color_palettes()
        fig = px.area(
            df_date_counts, 
            x='날짜', 
            y='불참자 수',
            title=f"날짜별 불참자 수 추이 (평균 {mean_absence:.1f}명, 총 {total_days}일)",
            template=template,
            color_discrete_sequence=[optimized_colors['qualitative_safe'][0]]
        )
        
        # 평균선만 추가 (복잡한 트렌드 라인 제거)
        fig.add_hline(
            y=mean_absence,
            line_dash="dash",
            line_color="orange",
            annotation_text=f"평균: {mean_absence:.1f}명",
            annotation_position="top right"
        )
        
        # 최적화된 스타일 적용
        fig = style_figure(fig, template, height=300)
        fig = enhance_chart_accessibility(fig, 'line')
        fig.update_layout(xaxis_title="날짜", yaxis_title="불참자 수")
        
        # 단순화된 축 설정
        fig.update_xaxes(tickformat="%m/%d")
        
        # 최적화된 호버 정보
        fig.update_traces(
            fill='tonexty',
            hovertemplate='<b>%{x|%Y-%m-%d}</b><br>불참자 수: %{y}명<extra></extra>'
        )
        
        return fig
        
    except Exception as e:
        logger.exception(f"[absence] 영역 차트 생성 오류: {e}")
        return px.area(template=template).update_layout(
            annotations=[dict(text="차트 생성 오류", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
        )

# 월별 불참 추이 차트 생성 함수 추가
def create_monthly_absence_chart(absence_data, template):
    """월별 불참 추이 차트 생성 - 데이터과학적 개선"""
    try:
        # 템플릿 안전성 검사
        if not isinstance(template, str):
            template = "plotly_white"
            
        if "dates" not in absence_data or not absence_data["dates"]:
            return px.line(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
    
        # 최적화된 데이터 처리 (리스트 컴프리헨션 사용)
        date_list = []
        for date_str, info in absence_data["dates"].items():
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                date_list.append({
                    'month': date_obj.strftime("%Y-%m"),
                    'count': len(info["absent_members"])
                })
            except ValueError:
                continue
        
        if not date_list:
            return px.line(template=template).update_layout(
                annotations=[dict(text="월별 데이터 변환 실패", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
        
        # DataFrame 생성 및 집계 (한 번에 처리)
        df_temp = pd.DataFrame(date_list)
        df_monthly = df_temp.groupby('month', as_index=False).agg({
            'count': ['sum', 'count']
        })
        df_monthly.columns = ['월', '불참자 수', '일수']
        df_monthly['평균_불참자_수'] = df_monthly['불참자 수'] / df_monthly['일수']
        df_monthly = df_monthly.sort_values('월')
        
        # 통계 정보 계산
        total_absences = df_monthly['불참자 수'].sum()
        mean_monthly = df_monthly['불참자 수'].mean()
        peak_month = df_monthly.loc[df_monthly['불참자 수'].idxmax()]
        
        # 최적화된 월별 히트맵 생성을 위한 데이터 변환 (날짜 변환 한 번만 수행)
        df_monthly['date'] = pd.to_datetime(df_monthly['월'])
        df_monthly['월_숫자'] = df_monthly['date'].dt.month
        df_monthly['연도'] = df_monthly['date'].dt.year
        
        # 피벗 테이블 생성 (히트맵 형태)
        pivot_data = df_monthly.pivot_table(
            index='연도', 
            columns='월_숫자', 
            values='불참자 수', 
            fill_value=0
        )
        
        # 최적화된 히트맵 생성 (바 차트보다 성능 우수)
        optimized_heatmap_colors = get_color_for_chart_type('heatmap')
        fig = px.imshow(
            pivot_data,
            text_auto=True,
            aspect="auto",
            title=f"월별 불참 히트맵 (총 {total_absences}명, 최고: {peak_month['월']} {peak_month['불참자 수']}명)",
            labels=dict(x="월", y="연도", color="불참자 수"),
            color_continuous_scale=optimized_heatmap_colors,
            template=template
        )
        
        # 최적화된 레이아웃 설정
        fig.update_traces(
            textfont_size=12,
            hovertemplate='<b>%{y}년 %{x}월</b><br>불참자 수: %{z}명<extra></extra>'
        )
        
        # 월 라벨 설정
        fig.update_xaxes(
            title_text="월",
            tickvals=list(pivot_data.columns),
            ticktext=[f"{i}월" for i in pivot_data.columns]
        )
        fig.update_yaxes(title_text="연도")
        
        # 스타일 및 접근성 적용
        fig = style_figure(fig, template, height=max(200, len(pivot_data) * 50))
        fig = enhance_chart_accessibility(fig, 'heatmap')
        
        return fig
    except Exception as e:
        logger.exception(f"[absence] 월별 차트 생성 오류: {e}")
        return px.line(template=template).update_layout(
            annotations=[dict(text="차트 생성 오류", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
        )

 

# 14. 불참 데이터 업로드 처리 콜백
@app.callback(
    [Output('absence-data', 'data', allow_duplicate=True),
     Output('absence-save-status', 'children', allow_duplicate=True)],
    Input('upload-absence-data', 'contents'),
    State('upload-absence-data', 'filename'),
    prevent_initial_call=True
)
def update_absence_store(contents, filename):
    if contents is None:
        return dash.no_update, dash.no_update
    
    try:
        content_type, content_string = contents.split(',')
        decoded = base64.b64decode(content_string)
        
        if isinstance(filename, str) and filename.lower().endswith('.json'):
            # JSON 파일 처리
            loaded_data = json.loads(decoded.decode('utf-8'))
            
            # 데이터 구조 검증 및 새 형식으로 변환
            if "dates" not in loaded_data:
                raise ValueError("유효하지 않은 불참 데이터 형식입니다. 'dates' 필드가 필요합니다.")
            
            # 새 데이터 형식 (dates만 포함)
            absence_data = {
                "dates": loaded_data["dates"]
            }
            
            # 총 불참 횟수 계산 (표시용)
            total_absences = calculate_total_absences(absence_data)
            absence_count = sum(total_absences.values()) if total_absences else 0
            members_count = len(total_absences) if total_absences else 0
            
            return absence_data, html.Span(f"불참 데이터 '{filename}' 업로드 완료! ({members_count} 명의 팀원, {absence_count} 건의 불참 기록)", className='success-message')
        else:
            return dash.no_update, html.Span(f"지원되지 않는 파일 형식입니다: {filename}. JSON 파일만 가능합니다.", className='error-message')
        
    except Exception as e:
        logger.exception(f"[absence] 불참 데이터 업로드 오류: {e}")
        return dash.no_update, user_msg(f"불참 데이터 업로드 오류: {e}", level='error')

# 15. 불참자 관리 영역 접기/펼치기 콜백
@app.callback(
    [Output('absence-collapse-content', 'className'),
     Output('absence-collapse-icon', 'children')],
    Input('absence-collapse-button', 'n_clicks'),
    State('absence-collapse-content', 'className'),
    prevent_initial_call=False  # 초기 로드 시 실행 허용 (기본값 접힘)
)
def toggle_absence_collapse(n_clicks, current_class):
    # n_clicks가 None이면 초기 상태 (접힘)
    if n_clicks is None or n_clicks % 2 == 0:
        return 'collapse-content collapsed', '펼치기 ▼'
    else:
        return 'collapse-content expanded', '접기 ▲'

# 팀원별 불참 비율 파이 차트 생성 함수 추가
def create_absence_pie_chart(absence_counts, template):
    """팀원별 불참 비율 트리맵 생성 - 성능 최적화"""
    # 템플릿 안전성 검사
    if not isinstance(template, str):
        template = "plotly_white"
    
    try:
        # absence_counts가 None이거나 비어있는지 안전하게 체크 (dict 또는 Series 모두 처리)
        if absence_counts is None:
            return px.treemap(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
        
        # pandas Series인 경우 dict로 변환
        if isinstance(absence_counts, pd.Series):
            absence_counts = absence_counts.to_dict()
        
        # dict인 경우 길이 체크
        if not isinstance(absence_counts, dict) or len(absence_counts) == 0:
            return px.treemap(template=template).update_layout(
                annotations=[dict(text="데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
    
        # 최적화된 데이터 처리
        df_absence = pd.DataFrame(list(absence_counts.items()), columns=['팀원', '불참 횟수'])
        total_absences = df_absence['불참 횟수'].sum()
        
        # 0이 아닌 데이터만 필터링 (비율 계산 제거 - 트리맵이 자동 계산)
        df_treemap = df_absence[df_absence['불참 횟수'] > 0].sort_values('불참 횟수', ascending=False)
        
        if df_treemap.empty:
            return px.treemap(template=template).update_layout(
                annotations=[dict(text="불참 데이터 없음", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
            )
        
        # 색상 팔레트 사전 계산
        optimized_treemap_colors = get_color_for_chart_type('treemap')
        
        # 최적화된 트리맵 생성
        fig = px.treemap(
            df_treemap,
            path=['팀원'], 
            values='불참 횟수',
            color='불참 횟수',
            color_continuous_scale=optimized_treemap_colors,
            title=f"팀원별 불참 비율 분포 (총 {total_absences}회)",
            template=template
        )
        
        # 최적화된 레이아웃 설정
        fig.update_traces(
            textfont_size=14,
            textinfo="label+value+percent root",
            texttemplate="<b>%{label}</b><br>%{value}회<br>(%{percentRoot:.1%})",
            hovertemplate='<b>%{label}</b><br>불참 횟수: %{value}회<br>전체 비율: %{percentRoot:.1%}<extra></extra>'
        )
        
        # 스타일 및 접근성 적용
        fig = style_figure(fig, template, height=350)
        fig = enhance_chart_accessibility(fig, 'treemap')
        
        return fig
        
    except Exception as e:
        logger.exception(f"[absence] 트리맵 생성 오류: {e}")
        return px.treemap(template=template).update_layout(
            annotations=[dict(text="차트 생성 오류", showarrow=False, xref="paper", yref="paper", x=0.5, y=0.5)]
        )

# 메모 편집 시작 콜백
@app.callback(
    Output('team-memo-edit-store', 'data'),
    Input({'type': 'edit-member-memo-btn', 'index': ALL}, 'n_clicks'),
    [State({'type': 'edit-member-memo-btn', 'index': ALL}, 'id')],
    prevent_initial_call=True
)
def start_edit_member_memo(n_clicks_list, ids):
    ctx = dash.callback_context
    if not ctx.triggered or not any(n_clicks_list or []):
        return dash.no_update
    triggered = ctx.triggered[0]['prop_id']
    triggered_id = safe_parse_callback_id(triggered)
    if triggered_id is None:
        return dash.no_update
    member_id = triggered_id.get('index')
    return {'editing_member_id': member_id}

# 메모 저장 콜백
@app.callback(
    [Output('team-members-store', 'data', allow_duplicate=True),
     Output('team-status-message', 'children', allow_duplicate=True),
     Output('team-activity-log', 'data', allow_duplicate=True),
     Output('team-activity-log-view', 'children', allow_duplicate=True),
     Output('team-memo-edit-store', 'data', allow_duplicate=True)],
    Input({'type': 'save-member-memo-btn', 'index': ALL}, 'n_clicks'),
    [State({'type': 'save-member-memo-btn', 'index': ALL}, 'id'),
     State({'type': 'edit-member-memo-input', 'index': ALL}, 'id'),
     State({'type': 'edit-member-memo-input', 'index': ALL}, 'value'),
     State('team-members-store', 'data'),
     State('team-activity-log', 'data')],
    prevent_initial_call=True
)
def save_member_memo(n_clicks_list, save_ids, input_ids, input_values, current_data, activity_log):
    ctx = dash.callback_context
    if not ctx.triggered or not any(n_clicks_list or []):
        return dash.no_update, dash.no_update, dash.no_update, render_activity_log(activity_log), dash.no_update
    triggered = ctx.triggered[0]['prop_id']
    triggered_id = safe_parse_callback_id(triggered)
    if triggered_id is None:
        return dash.no_update, user_msg("저장 대상 식별에 실패했습니다.", level='error'), dash.no_update, render_activity_log(activity_log), dash.no_update
    member_id = triggered_id.get('index')

    # 입력값 찾기
    new_memo = ''
    try:
        for i, iid in enumerate(input_ids or []):
            if isinstance(iid, dict) and iid.get('type') == 'edit-member-memo-input' and iid.get('index') == member_id:
                new_memo = (input_values or [''])[i] or ''
                break
    except Exception:
        new_memo = ''

    # 데이터 안전 초기화
    if current_data is None or 'members' not in current_data:
        current_data = {'members': {}}
    if member_id not in current_data['members']:
        current_data['members'][member_id] = {
            'name': member_id,
            'memo': '',
            'is_active': True,
            'preferences': {}
        }

    current_data['members'][member_id]['memo'] = (new_memo or '').strip()

    # 활동 로그
    if not isinstance(activity_log, list):
        activity_log = []
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    activity_log.append({'ts': timestamp, 'level': 'success', 'msg': f"팀원 '{member_id}' 메모가 저장되었습니다."})
    view_text = render_activity_log(activity_log)

    return (
        current_data,
        user_msg(f"'{member_id}' 메모를 저장했습니다.", level='success'),
        activity_log,
        view_text,
        {'editing_member_id': None}
    )

# 메모 편집 취소 콜백
@app.callback(
    Output('team-memo-edit-store', 'data', allow_duplicate=True),
    Input({'type': 'cancel-member-memo-btn', 'index': ALL}, 'n_clicks'),
    prevent_initial_call=True
)
def cancel_edit_member_memo(n_clicks_list):
    ctx = dash.callback_context
    if not ctx.triggered or not any(n_clicks_list or []):
        return dash.no_update
    return {'editing_member_id': None}

if __name__ == '__main__':
    # 로컬에서 실행 시 포트 지정 가능 (예: port=8051)
    # host='0.0.0.0' 추가 시 외부 접속 허용 (주의!)
    app.run(host='127.0.0.1', port=12000, debug=True, use_reloader=False) 
