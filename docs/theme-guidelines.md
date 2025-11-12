# Position Helper 테마 가이드라인

## 1. 현행 색상·토큰 사용 현황
- 전역 CSS(`src/theme/theme.css`)은 `--bg`, `--panel`, `--surface`, `--text`, `--muted`, `--text-secondary`, `--accent`, `--danger`, `--border`, `--shadow` 등 10개 변수를 중심으로 구성되어 있으며, 라이트 테마는 `html[data-theme='light']`에서 별도 재정의.
- 표면 계층은 `var(--panel)`과 `var(--surface)` 두 단계뿐이며, 카드·모달·토스트 등 다수의 컴포넌트가 동일한 토큰을 공유하여 명도 구분이 부족함.
- 텍스트 계열은 `--text`, `--muted`, `--text-secondary` 3종으로 제한되어, 비주얼 계층과 상태 표현 구분(예: 정보/보조/디스에이블드)이 미흡.
- 포커스/상호작용 색상 대부분이 `var(--accent)`와 고정된 `rgba(10, 132, 255, …)` 계열에 의존해, 라이트·다크 간 대비 곡선이 동일하고 색상 심리 변화가 제한됨.
- `StatsView` 등 데이터 시각화 컴포넌트는 Plotly trace 색상을 하드코딩(`#2563eb`, `#93c5fd`, `#f87171` 등)하여 테마 전환 시 톤 편차와 대비 유지가 어렵고 유지 보수 비용 증가.
- 인라인 스타일에서도 `var(--border)`, `var(--surface)`, `var(--danger)`, `var(--text-secondary)` 등을 직접 사용하므로 토큰 구조 변경 시 광범위한 수정 필요.

## 2. 다섯 축 기반 설계 원칙
### 2.1 색상 심리
- 라이트 테마는 자연광·낮 시간 업무 시 집중과 안정감을 주는 중성 계열(Desaturated Blue/Teal)과 긍정 신호용 저채도 그린을 사용한다.
- 다크 테마는 야간·암실 환경에서 시각적 깊이를 확보하기 위해 자정 블루·그레이 네이비를 베이스로 하며, 알림·위험 색상은 음영을 낮춰 잔상 부담을 줄인다.

### 2.2 시각 피로
- 라이트 테마는 백색광 과다 노출을 피하기 위해 기본 배경을 완전한 화이트가 아닌 96~98% L* 영역으로 설정하고, 본문 텍스트는 8:1 이상의 대비를 유지한다.
- 다크 테마는 12~18% L* 영역의 캔버스를 기본으로 하되 순흑(#000)에 가깝지 않은 딥 네이비를 사용하여 블룸 현상과 눈부심을 줄인다.

### 2.3 대비
- 핵심 UI 요소 대비비는 WCAG 2.1 기준 최소 4.5:1을 준수하고, 알림·CTA는 7:1 이상 확보한다.
- 차트·데이터 시각화는 라인/필 색 대비뿐 아니라 호버·선택 상태까지 고려해 시각적 명확성을 유지한다.

### 2.4 명도 일관성
- 표면 계층(캔버스, 표면, 패널, 오버레이)은 최소 4단계 명도 간격(약 6~8 L* 간격)을 유지하고, 각 계층 간 그림자와 경계선이 과도하거나 부족하지 않도록 조정한다.
- 텍스트 계층(기본, 보조, 비활성, 역상)은 각 표면과 조합 시 일정한 대비비를 보장하도록 설정한다.

### 2.5 콘텐츠 인지 효율
- 데이터 밀도가 높은 화면에서는 텍스트·데이터 강조 색상을 두드러지게 유지하되, 그 외 UI는 낮은 명도 대비로 배경화하여 시각적 노이즈를 줄인다.
- 점진적 강조 전략(색상 → 굵기 → 아이콘 → 보더)을 적용해 사용자가 한 번에 받아들여야 할 정보량을 조절한다.

## 3. 조명 환경·피로도·시각적 균형 기준
- **라이트 테마(주간/밝은 조명)**: 주변광이 강하다는 가정 아래 사선광 반사로 인한 색 왜곡을 최소화하기 위해 저채도 컬러를 기본값으로 사용. 그림자는 선명하게, 경계선은 80~88% 명도의 슬레이트를 활용해 구조적 안정감을 제공.
- **다크 테마(야간/간접 조명)**: 빈번한 밝기 대비 전환이 피로를 높이므로, 액센트 색상은 고채도 대신 명도 대비 위주로 조정하고, 패널 배경은 캔버스 대비 +6~8 L* 범위에서 유지한다.
- **시각적 균형**: 차트·카드·폼 등 정보 덩어리의 크기/색상/명도를 한 화면에서 균형 잡도록 `surface-layer-1~3` 토큰을 사용하며, 시선 흐름은 좌상→우하 방향으로 자연스럽게 이동하도록 대비 그라데이션을 구성한다.

## 4. 기존 테마 토큰 폐기·대체 방안
- `--bg`, `--panel`, `--surface` 등의 단일 계층 토큰은 `--color-canvas`, `--color-surface-1`, `--color-surface-2`, `--color-surface-3`로 세분화한다.
- `--text`, `--muted`, `--text-secondary`는 역할 중심(`--color-text-primary`, `--color-text-muted`, `--color-text-subtle`, `--color-text-inverse`, `--color-text-on-accent`)으로 재정의한다.
- 상태·강조 색상은 `--accent`, `--danger` 대신 `--color-accent`, `--color-accent-soft`, `--color-positive`, `--color-warning`, `--color-critical` 등 의미 기반 토큰으로 대체한다.
- 그림자와 보더는 명도 차이를 기준으로 `--shadow-soft`, `--shadow-strong`, `--color-border-subtle`, `--color-border-strong` 등으로 구분하며, 라이트/다크 각각 독립 정의.
- 데이터 시각화를 위해 `--data-series-1~6`, `--data-positive`, `--data-negative`, `--data-neutral` 토큰을 추가해, Plotly 및 기타 차트 컴포넌트가 공통 팔레트를 참조하도록 한다.

## 5. 구현 시 고려 사항
- 테마 스위처는 시스템 선호(`prefers-color-scheme`) 초기값과 로컬 저장소 값을 동기화하며, 토큰 변경 시 `data-theme` 속성만 달라지도록 구조화한다.
- 컴포넌트 스타일은 가능하면 CSS 클래스/모듈에서 토큰을 사용하고, 인라인 스타일은 최소화하여 유지 보수를 단순화한다.
- Plotly 등 외부 라이브러리는 토큰 값을 런타임에서 읽을 수 있도록 헬퍼(`getComputedStyle(document.documentElement)`)를 사용하거나, CSS 변수 기반 색상을 전달하는 래퍼를 도입한다.
- 대비 측정은 주요 화면(Assign, Members, Stats, Settings)에서 라이트/다크 각각 `color-contrast-checker` 도구 결과를 기록하고, 4.5:1 미만 요소는 개선안을 마련한다.

## 6. 향후 작업 개요
1. 전역 토큰 스키마를 설계하고 `theme.css`를 재작성한다.
2. 버튼·배지·패널·폼 요소 등 공통 컴포넌트를 새 토큰으로 마이그레이션한다.
3. Plotly 차트를 포함한 데이터 시각화 색상 체계를 토큰 기반으로 재구성한다.
4. QA 체크리스트(명암비, 색각 이상 친화성, 야간/주간 스냅샷)를 마련하고 README에 요약을 추가한다.

## 7. 전역 토큰 스키마(초안)
| 카테고리 | 토큰 | 라이트 값 | 다크 값 | 비고 |
| --- | --- | --- | --- | --- |
| Canvas/Surface | `--color-canvas` | `#f5f7fb` | `#0e111a` | 기본 배경 |
|  | `--color-surface-1` | `#ffffff` | `#161b26` | 카드·인풋 기본 |
|  | `--color-surface-2` | `#eef2fb` | `#1d2534` | 패널·헤더 |
|  | `--color-surface-3` | `#e2e8f8` | `#253045` | 강조 패널 |
| Text | `--color-text-primary` | `#1f2937` | `#f1f5ff` | 본문 |
|  | `--color-text-muted` | `#4b5563` | `#c5cee0` | 보조 텍스트 |
|  | `--color-text-subtle` | `#64748b` | `#9aa3bb` | 레이블/서브 |
|  | `--color-text-disabled` | `rgba(99,107,129,0.5)` | `rgba(154,163,187,0.45)` | 비활성 |
| Accent/State | `--color-accent` | `#2563eb` | `#7dadff` | 주요 CTA |
|  | `--color-positive` | `#0f9d58` | `#44d38a` | 긍정 |
|  | `--color-warning` | `#f59e0b` | `#f7b955` | 경고 |
|  | `--color-critical` | `#d92d43` | `#ff748b` | 오류 |
| Border | `--color-border-subtle` | `#d5ddeb` | `#2b3448` | 기본 보더 |
|  | `--color-border-strong` | `#a3b3cc` | `#404b64` | 강조 보더 |
| Focus/Shadow | `--focus-ring` | `rgba(37,99,235,0.28)` | `rgba(125,173,255,0.45)` | 포커스 |
|  | `--shadow-surface` | `0 20px 40px -26px rgba(15,23,42,0.18)` | `0 22px 48px -28px rgba(4,10,24,0.7)` | 표면 그림자 |
|  | `--shadow-floating` | `0 28px 68px -34px rgba(15,23,42,0.24)` | `0 28px 68px -36px rgba(2,10,30,0.75)` | 플로팅 |
| 데이터 | `--data-series-1`~`6` | `#2563eb`, `#0d9488`, `#f97316`, `#9333ea`, `#d92d43`, `#14b8a6` | `#7dadff`, `#44d38a`, `#f7b955`, `#c4b5fd`, `#ff87b2`, `#64d2ff` | Plotly 팔레트 |
|  | `--data-positive` | `#16a34a` | `#44d38a` | 상승/좋음 |
|  | `--data-negative` | `#dc2626` | `#ff748b` | 하락/경고 |
|  | `--data-neutral` | `#475569` | `#9aa3bb` | 중립 |

## 8. 명암비·피로도 검증 체크리스트
1. **화면 스냅샷 비교**  
   - `Assign`, `Members`, `Stats`, `Settings` 네 화면을 라이트/다크 각각 캡처해 동일 해상도로 보관.  
   - 모니터 밝기 80%/40% 두 조건에서 실사용자에게 노출 후 피로도 피드백을 기록한다.
2. **명암비 측정**  
   - [Accessibility Insights](https://accessibilityinsights.io/) 또는 `axe DevTools`를 이용해 본문 문구, 카드 헤더, 버튼, 배지의 대비비를 측정한다.  
   - 기준: 일반 텍스트 ≥ 4.5:1, 대형 텍스트 ≥ 3:1, CTA/경고 요소 ≥ 7:1.
3. **데이터 시각화 가독성**  
   - StatsView의 막대/라인/산점도/히트맵에서 포커스·호버 상태를 확인하고 토글 시 색상 변화가 명확한지 체크.  
   - 색각 이상 모드(브라우저 DevTools → Rendering → Emulate vision deficiencies)로 적록색약, 청황색약을 각각 확인.
4. **상호작용 상태**  
   - 포커스 링, 버튼 hover, 토글 상태 등 인터랙션 피드백이 라이트/다크 테마 모두에서 최소 3단계 이상의 대비 차이를 제공하는지 확인.  
   - 키보드 탭 순서대로 전 화면을 탐색하며 가독성을 기록한다.
5. **장시간 사용 시나리오**  
   - 30분 이상 데이터 편집/배정 작업 후 눈부심, 피로 지점(너무 밝은 영역, 대비 과도 영역 등) 메모.  
   - 다크 테마에서 푸터/패널과 캔버스의 명도 차가 6~8 L* 범위 내인지 컬러 피커로 재검증.

## 9. 인터랙션 애니메이션 원칙
- **의도 중심**: 모든 동작은 상태 변화 전달, 연속성 유지, 주의 유도, 감정적 완화 중 한 가지 이상을 설명할 수 있을 때만 적용한다.
- **속도 가이드**  
  - 마이크로 인터랙션(버튼, 스위치): 150~220ms  
  - 패널·모달·드롭다운: 260~340ms  
  - 페이지/대규모 레이아웃 전환: 420~560ms  
  - Plotly 차트 갱신: 200~280ms (데이터 변화에 집중)
- **Easing 규칙**  
  - 등장: `ease-out`  
  - 퇴장: `ease-in`  
  - 양방향 상태 전환: `ease-in-out` (Cubic)  
  - Spring/Bounce 계열은 정보 도구 특성상 사용하지 않는다.
- **표준 모션 토큰**  
  - `--motion-duration-quick` = 180ms  
  - `--motion-duration-medium` = 280ms  
  - `--motion-duration-slow` = 480ms  
  - `--motion-ease-standard` = `cubic-bezier(0.4, 0.0, 0.2, 1)`  
  - `--motion-ease-emphasis` = `cubic-bezier(0.3, 0.0, 0.2, 1)`  
  - `--motion-ease-decelerate` = `cubic-bezier(0.0, 0.0, 0.2, 1)`  
  - `--motion-ease-accelerate` = `cubic-bezier(0.4, 0.0, 1, 1)`
- **적용 패턴**  
  - 버튼·카드: hover 시 scale 1.02 → 1, opacity 0.85 → 1, 180ms  
  - 모달·드롭다운: opacity + translateY(12px), 280~320ms  
  - 토스트: Y축 20px slide-in + opacity, 퇴장 시 160ms fade-out  
  - 경고/배지: 색상·윤곽선 전환 180ms 이내  
  - StatsView 차트: 기존 데이터 120ms fade-out 후 새 데이터 fade-in (총 240ms, `easeInOutCubic`)
- **접근성**: `prefers-reduced-motion: reduce` 환경에서는 애니메이션을 즉시 전환으로 대체하고, 모션 관련 토큰을 1ms로 축소한다.




