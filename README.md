# 🎯 포지션 배정 도우미

팀원들의 포지션 배정 현황을 관리하고 다음 주 배정을 제안받을 수 있는 Dash 기반 웹 애플리케이션입니다.

## 주요 기능

- 📊 **포지션 관리**: JSON 파일을 업로드하여 팀원들의 포지션 배정 현황을 확인하고 관리
- 👥 **팀원 관리**: 팀원 정보 및 메모 관리
- 📅 **불참자 관리**: 날짜별 불참자 등록 및 통계 확인
- 📈 **데이터 시각화**: Plotly를 활용한 다양한 차트 및 그래프
- 🌙 **다크 모드**: 다크 모드/라이트 모드 전환 지원
- 💾 **로컬 저장소**: 브라우저 로컬 스토리지를 활용한 데이터 저장

## 기술 스택

- **Python 3.x**
- **Dash 3.2.0** - 웹 애플리케이션 프레임워크
- **Plotly 6.3.0** - 데이터 시각화
- **Pandas 2.3.2** - 데이터 처리
- **Flask-Caching 2.3.0** - 캐싱 기능

## 설치 방법

1. 저장소 클론:
```bash
git clone https://github.com/your-username/position-helper.git
cd position-helper
```

2. 가상 환경 생성 및 활성화 (권장):
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. 의존성 설치:
```bash
pip install -r requirements.txt
```

## 실행 방법

```bash
python app_dash.py
```

애플리케이션이 실행되면 브라우저에서 `http://127.0.0.1:8050` (또는 표시된 주소)로 접속하세요.

## 프로젝트 구조

```
position-helper/
├── app_dash.py          # 메인 애플리케이션 파일
├── requirements.txt     # Python 패키지 의존성
├── .gitignore          # Git 제외 파일 목록
├── README.md           # 프로젝트 설명서
├── assets/             # CSS 및 JavaScript 파일
│   ├── 00-base.css
│   ├── clientside.js
│   ├── styles.css
│   └── zz-dark.css
└── utils/              # 유틸리티 모듈
    ├── __init__.py
    └── dataframes.py
```

## 사용 방법

1. **JSON 파일 업로드**: 포지션 관리 탭에서 JSON 파일을 업로드합니다.
2. **데이터 확인 및 편집**: 업로드된 데이터를 테이블에서 확인하고 편집할 수 있습니다.
3. **불참자 등록**: 날짜와 팀원을 선택하여 불참자를 등록합니다.
4. **시각화 확인**: 다양한 차트를 통해 데이터를 시각적으로 확인합니다.
5. **데이터 저장**: 편집한 데이터를 JSON 파일로 다운로드할 수 있습니다.

## 로깅

애플리케이션은 `app.log` 파일에 로그를 기록합니다. 로그 파일은 최대 1MB까지 저장되며, 최대 3개의 백업 파일이 유지됩니다.

## 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.

## 기여

버그 리포트나 기능 제안은 이슈를 통해 제출해주세요.

