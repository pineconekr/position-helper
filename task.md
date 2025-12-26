# 프로젝트 작업 목록 (Project Tasks)

## 🚀 현재 상태
- **단계**: 유지보수 및 기능 강화
- **상태**: 핵심 기능들이 구현된 것으로 보임.
- **우선순위**: PRD 및 Feature/Shared 아키텍처와의 정렬 상태 확인.

## 📋 할 일 목록 (To-Do List)

### 1. 초기화 및 문서화 (진행중)
- [x] PRD 작성 (`PRD.md`)
- [x] 시스템 문서 작성 및 한글화 (`task.md`, `implementation_plan.md`, `rules.md`, `walkthrough.md`)
- [ ] 프로젝트 빌드 및 실행 상태 최종 확인

### 2. 기능 검증
- **배정 기능 (Assignment)**
    - [ ] 드래그 앤 드롭 기능 동작 확인
    - [ ] 자동 저장 및 데이터 유지 확인
- **팀원 관리 (Members)**
    - [ ] 팀원 정보 추가/수정/삭제 기능 확인
- **통계 및 대시보드 (Stats)**
    - [ ] Plotly 차트 렌더링 확인
    - [ ] 데이터 집계 로직의 정확성 검토
- **데이터 영속성**
    - [ ] Tauri FS API를 통한 JSON 파일 읽기/쓰기 검증

### 3. 리팩토링 및 최적화
- [ ] Feature-Sliced Design (클라이언트 사이드 변형) 구조 준수 확인
- [ ] `shared/components`의 재사용성 점검

### 4. 향후 기능 (Backlog)
- [ ] 고급 규칙 엔진 설정 UI 추가
- [ ] PDF/이미지 내보내기 기능
