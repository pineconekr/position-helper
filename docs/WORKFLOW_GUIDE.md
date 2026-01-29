# 🎯 Antigravity 워크플로우 가이드

> Position Helper 프로젝트에서 사용할 수 있는 35개의 슬래시 커맨드 설명서입니다.
> 채팅창에서 `/`를 입력하면 모든 커맨드가 표시됩니다.

---

## 📋 빠른 참조표

| 상황 | 추천 커맨드 |
|------|-------------|
| 새 기능 개발 시작 | `/plan` → `/tdd` → `/code-review` |
| 빌드 오류 발생 | `/build-fix` 또는 `/build-error-resolver` |
| 코드 품질 검토 | `/code-review` 또는 `/code-reviewer` |
| 보안 점검 필요 | `/security-reviewer` |
| 아키텍처 설계 | `/architect` → `/planner` |
| 테스트 작성 | `/tdd` 또는 `/test-coverage` |
| E2E 테스트 | `/e2e` 또는 `/e2e-runner` |
| 데드 코드 정리 | `/refactor-clean` 또는 `/refactor-cleaner` |
| DB 스키마 검토 | `/database-reviewer` |
| 문서 업데이트 | `/update-docs` 또는 `/doc-updater` |

---

## 🔧 카테고리별 상세 설명

### 1️⃣ 계획 및 설계 (Planning & Architecture)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/plan` | 요구사항 분석 후 단계별 구현 계획 생성 | 새 기능 개발 전 **반드시** 실행 |
| `/planner` | 복잡한 기능/리팩토링 계획 수립 전문가 | 대규모 변경 필요 시 |
| `/architect` | 시스템 설계, 확장성, 기술 결정 | 아키텍처 결정이 필요할 때 |
| `/orchestrate` | 여러 에이전트를 순차 실행 (feature/bugfix/refactor) | 복잡한 작업을 자동화할 때 |

**💡 팁**: 기능 개발 순서: `/plan` → 구현 → `/code-review`

---

### 2️⃣ 빌드 및 오류 해결 (Build & Error Resolution)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/build-fix` | TypeScript/빌드 오류를 하나씩 수정 | 빌드 실패 시 빠른 수정 |
| `/build-error-resolver` | 빌드 오류 해결 전문 에이전트 | 복잡한 빌드 오류 시 |
| `/verify` | 빌드/타입/린트/테스트 종합 검증 | PR 전 최종 확인 |

**💡 팁**: `npm run build` 실패 시 → `/build-fix` 실행

---

### 3️⃣ 코드 리뷰 및 품질 (Code Review & Quality)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/code-review` | 커밋되지 않은 변경사항 보안/품질 검토 | 커밋 전 항상 |
| `/code-reviewer` | 코드 품질/보안/유지보수성 전문 검토 | 중요한 변경 후 |
| `/security-reviewer` | 보안 취약점 탐지 및 수정 | 인증/결제/민감 데이터 처리 시 |

**⚠️ 중요**: 사용자 입력, API, 인증 로직 수정 시 반드시 `/security-reviewer` 실행!

---

### 4️⃣ 테스트 (Testing)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/tdd` | 테스트 먼저 작성 → 구현 (TDD 워크플로우) | 새 기능 개발 시 |
| `/tdd-guide` | TDD 방법론 전문 가이드 | TDD 학습/적용 시 |
| `/test-coverage` | 테스트 커버리지 분석 및 누락 테스트 생성 | 80%+ 커버리지 달성 목표 시 |
| `/e2e` | Playwright E2E 테스트 생성/실행 | 사용자 여정 테스트 시 |
| `/e2e-runner` | E2E 테스트 전문 에이전트 | 복잡한 E2E 시나리오 |

**💡 팁**: TDD 사이클 = RED(실패 테스트) → GREEN(구현) → REFACTOR(개선)

---

### 5️⃣ 리팩토링 및 정리 (Refactoring & Cleanup)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/refactor-clean` | 데드 코드 식별 및 안전하게 제거 | 코드 정리 시 |
| `/refactor-cleaner` | 데드 코드/중복 제거 전문 에이전트 | 대규모 정리 시 |

---

### 6️⃣ 문서화 (Documentation)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/update-docs` | package.json/.env에서 문서 동기화 | 설정 변경 후 |
| `/doc-updater` | 문서/코드맵 업데이트 전문가 | 아키텍처 문서 갱신 시 |
| `/update-codemaps` | 코드베이스 구조 분석 및 아키텍처 문서 갱신 | 구조 변경 후 |

---

### 7️⃣ 데이터베이스 (Database)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/database-reviewer` | PostgreSQL/Supabase 쿼리 최적화, RLS, 스키마 검토 | DB 작업 시 |

---

### 8️⃣ 체크포인트 및 학습 (Checkpoint & Learning)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/checkpoint` | 워크플로우 체크포인트 생성/검증 | 안전한 개발을 위해 |
| `/eval` | 기능별 평가 정의/체크/리포트 | 기능 완성도 평가 시 |
| `/learn` | 현재 세션에서 재사용 패턴 추출 | 문제 해결 후 패턴 저장 |
| `/evolve` | 관련 인스팅트를 스킬/커맨드/에이전트로 클러스터링 | 학습 고도화 |

---

### 9️⃣ 인스팅트 관리 (Instinct Management)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/instinct-status` | 학습된 인스팅트 현황 확인 | 현재 학습 상태 확인 |
| `/instinct-export` | 인스팅트 내보내기 (팀 공유용) | 팀원과 공유 시 |
| `/instinct-import` | 외부 인스팅트 가져오기 | 팀 인스팅트 도입 시 |

---

### 🔟 Go 언어 전용 (Go-specific)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/go-build` | Go 빌드 오류/vet 경고 수정 | Go 프로젝트 빌드 실패 시 |
| `/go-build-resolver` | Go 빌드 오류 해결 전문 에이전트 | 복잡한 Go 오류 시 |
| `/go-review` | Go 코드 리뷰 (관용적 패턴, 동시성, 보안) | Go 코드 검토 시 |
| `/go-reviewer` | Go 코드 리뷰 전문 에이전트 | Go 전문 검토 시 |
| `/go-test` | Go TDD 워크플로우 (테이블 드리븐 테스트) | Go 테스트 작성 시 |

---

### 1️⃣1️⃣ 기타 유틸리티 (Utilities)

| 커맨드 | 설명 | 언제 사용? |
|--------|------|-----------|
| `/setup-pm` | 패키지 매니저 설정 (npm/pnpm/yarn/bun) | 프로젝트 초기 설정 |
| `/skill-create` | Git 히스토리에서 코딩 패턴 추출 → SKILL.md 생성 | 팀 패턴 문서화 |

---

## 🚀 추천 워크플로우

### 새 기능 개발
```
1. /plan         → 요구사항 분석 및 계획
2. /tdd          → 테스트 먼저 작성
3. 구현 작업
4. /code-review  → 품질 검토
5. /verify       → 최종 검증
```

### 버그 수정
```
1. /tdd          → 버그 재현 테스트 작성
2. 수정 작업
3. /code-review  → 검토
4. /verify       → 검증
```

### 리팩토링
```
1. /architect    → 구조 검토
2. /refactor-clean → 데드 코드 제거
3. /code-review  → 품질 확인
4. /test-coverage → 테스트 보완
```

---

## 📌 자주 쓰는 TOP 5

1. **`/plan`** - 모든 작업의 시작점
2. **`/code-review`** - 커밋 전 필수
3. **`/build-fix`** - 빌드 오류 빠른 해결
4. **`/tdd`** - 테스트 주도 개발
5. **`/verify`** - PR 전 최종 검증

---

*마지막 업데이트: 2026-01-28*
