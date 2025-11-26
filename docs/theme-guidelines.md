# Position Helper 테마 가이드라인

## 1. 개요 및 목표
이 문서는 Position Helper의 시각적 일관성, 사용성, 접근성을 보장하기 위한 디자인 시스템 원칙과 구현 가이드를 정의한다.
기존의 파편화된 스타일을 **의미 기반 토큰 시스템**으로 통합하고, 라이트/다크 모드 및 데이터 시각화의 명확성을 확보하는 것을 목표로 한다.

## 2. 색상 시스템 (Color System)

### 2.1 명도 계층 구조 (Surface Hierarchy)
라이트/다크 테마 모두 4단계의 깊이감을 유지하여 정보의 위계를 표현한다.

| 계층 (Layer) | 역할 | Light (L*) | Dark (L*) | 토큰 |
| --- | --- | --- | --- | --- |
| **Canvas** | 앱의 최하단 배경 | 96~98% | 5~8% | `--color-canvas` |
| **Surface 1** | 카드, 입력창 등 기본 컨테이너 | 100% | 12~15% | `--color-surface-1` |
| **Surface 2** | 패널, 헤더, 보조 영역 | 93~95% | 18~22% | `--color-surface-2` |
| **Overlay** | 모달, 팝오버, 툴팁 | 100% + Shadow | 25~30% | `--color-surface-overlay` |

### 2.2 텍스트 및 가독성 (Typography Colors)
WCAG 2.1 AA 기준을 준수하기 위한 명암비 목표를 설정한다.

| 역할 | 토큰 | 명암비 목표 (vs Surface) | 사용처 |
| --- | --- | --- | --- |
| **Primary** | `--color-text-primary` | ≥ 12:1 | 본문, 헤딩, 주요 데이터 |
| **Muted** | `--color-text-muted` | ≥ 7:1 | 보조 설명, 메타데이터 |
| **Subtle** | `--color-text-subtle` | ≥ 4.5:1 | 플레이스홀더, 비활성 아이콘 |
| **Inverse** | `--color-text-inverse` | N/A | 반전 배경 위 텍스트 |
| **On-Accent**| `--color-text-on-accent` | ≥ 4.5:1 | 주요 버튼 위 텍스트 |

### 2.3 의미 및 상태 색상 (Semantic & State Colors)
색상만으로 정보를 전달하지 않도록 아이콘이나 텍스트를 병행한다.

| 역할 | 토큰 | Light | Dark | 의미 |
| --- | --- | --- | --- | --- |
| **Accent** | `--color-accent` | Blue 600 | Blue 400 | 주요 동작, 선택됨 |
| **Critical** | `--color-critical` | Red 600 | Red 400 | 오류, 삭제, 위험 |
| **Success** | `--color-success` | Emerald 600 | Emerald 400 | 완료, 긍정적 변화 |
| **Warning** | `--color-warning` | Amber 500 | Amber 400 | 주의, 대기중 |

## 3. 타이포그래피 & 레이아웃 (Typography & Layout)

### 3.1 타입 스케일 (Type Scale)
기본 폰트: System Fonts (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Pretendard` 등)

| 레벨 | 사이즈 (rem/px) | Line Height | Weight | 토큰 | 용도 |
| --- | --- | --- | --- | --- | --- |
| **Display** | 1.5 / 24px | 1.3 | 700 | `text-2xl` | 페이지 타이틀 |
| **Heading** | 1.25 / 20px | 1.4 | 600 | `text-xl` | 섹션 헤더, 카드 타이틀 |
| **Body** | 1.0 / 16px | 1.5 | 400/500 | `text-base` | 본문 기본 |
| **Small** | 0.875 / 14px | 1.5 | 400/500 | `text-sm` | 보조 텍스트, 버튼 |
| **Caption** | 0.75 / 12px | 1.4 | 400 | `text-xs` | 캡션, 태그 |

### 3.2 스페이싱 & 그리드 (Spacing & Grid)
4px(0.25rem)을 기본 단위로 하는 4/8 배수 시스템을 사용한다.

- **Spacing Scale**:
  - `space-1` (4px): 아이콘-텍스트 간격
  - `space-2` (8px): 촘촘한 그룹핑
  - `space-3` (12px): 요소 간 기본 간격
  - `space-4` (16px): 섹션 내부 여백 (모바일)
  - `space-6` (24px): 카드 패딩, 섹션 간격 (데스크탑)
  - `space-8` (32px): 큰 섹션 구분

- **Layout Grid**:
  - 데스크탑: Max-width 1280px, 12 column, Gutter 24px
  - 모바일: 100% width, 4 column, Gutter 16px, Margin 16px

## 4. 컴포넌트 디자인 원칙

### 4.1 상태 표현 (Interaction States)
모든 인터랙션 요소는 다음 상태를 명확히 구분해야 한다.

1.  **Idle**: 기본 상태
2.  **Hover**: 명도/채도 +5~10% 변화, Scale 1.02 (버튼)
3.  **Active (Pressed)**: Scale 0.98, Dimming
4.  **Focus**: `--focus-ring` (Accent color + opacity ring) 필수 표시
5.  **Disabled**: Opacity 0.5, `pointer-events: none`

### 4.2 콘텐츠 인지 효율 (Visual Hierarchy)
데이터 밀도가 높은 화면(Assign, Stats)에서는 다음 순서로 강조를 적용한다.
1.  **위치/크기**: 가장 중요한 정보는 좌상단, 크게 배치
2.  **색상**: Accent/Critical 컬러는 상태 변화나 중요 데이터에만 한정 사용
3.  **굵기**: 헤딩과 중요 수치는 Bold(600~700) 처리
4.  **보더/배경**: 보조 정보는 연한 보더나 배경색으로 그룹핑

## 5. 모션 & 인터랙션 (Motion & Interaction)

### 5.1 모션 토큰
| 토큰 | 시간 | Easing | 용도 |
| --- | --- | --- | --- |
| `--motion-quick` | 150ms | `ease-out` | 버튼 Hover, 체크박스 |
| `--motion-medium` | 250ms | `ease-out` | 툴팁, 드롭다운, 토스트 |
| `--motion-slow` | 400ms | `ease-in-out` | 모달, 페이지 전환, 패널 확장 |

### 5.2 접근성 대응
`@media (prefers-reduced-motion: reduce)` 환경에서는 모든 애니메이션 시간을 `0s` 또는 `1ms`로 재설정하여 즉각적인 피드백을 제공한다.

## 6. 차트 & 데이터 시각화
Plotly 및 커스텀 차트는 라이트/다크 모드에 따라 다음 팔레트를 자동으로 참조해야 한다.

- **Series Colors**: `--data-series-1` ~ `--data-series-6`
- **Semantic Data**:
  - Positive: `--data-positive` (Green)
  - Negative: `--data-negative` (Red)
  - Neutral: `--data-neutral` (Slate/Gray)
- **Chart UI**:
  - Grid: `--chart-grid` (매우 연한 투명도)
  - Text: `--color-text-muted`

## 7. 구현 체크리스트
- [ ] 모든 색상은 `var(--color-*)` 토큰만 사용 (Hex 코드 직접 사용 금지)
- [ ] 반응형 분기점은 `768px` (Mobile), `1024px` (Tablet/Desktop) 기준 준수
- [ ] 차트 컴포넌트는 `useTheme` 훅을 통해 현재 테마 색상을 JS로 주입
- [ ] 포커스 링은 키보드 네비게이션 시에만 보이거나 항상 보이도록 일관성 유지
