# Position Helper Design System

## 1. 개요
본 디자인 시스템은 **Apple의 정제된 미학**과 **Linear/Vercel의 높은 정보 밀도**를 결합한 **'Premium Productivity'** 스타일을 지향합니다.

- **디자인 방향성**: Apple-inspired Minimalist + Linear-inspired Data Density
- **기술 스택**: Tailwind CSS v4, Next.js, Framer Motion
- **핵심 가치**: 전문성, 신뢰성, 데이터 중심 가독성

---

## 2. 색상 시스템 (Semantic Color System)

모든 색상은 `app/globals.css` 내의 시맨틱 CSS 변수로 관리됩니다. 컴포넌트에서는 구체적 색상 값 사용을 지향하고 시스템 토큰을 참조합니다.

### 2.1 토큰 구조
`--color-{category}-{variant}`

| Category | 설명 | 예시 |
|:---|:---|:---|
| `canvas` | 기본 앱 배경 | `--color-canvas` |
| `surface` | 카드, 사이드바, 패널 | `--color-surface-primary`, `--color-surface-elevated` |
| `label` | 텍스트 컬러 | `--color-label-primary`, `--color-label-muted` |
| `border` | 경계선 및 구분선 | `--color-border-subtle`, `--color-border-strong` |
| `accent` | 브랜드 컬러 (Blue) | `--color-accent-primary`, `--color-accent-soft` |
| `status` | 상태 표현 | `--color-success`, `--color-warning`, `--color-danger` |

### 2.2 다크 모드 전략 (Tailwind v4)
`globals.css`에서 시맨틱 토큰의 값만 교체하며, 컴포넌트 내부에서 `dark:` 접두사 사용을 최소화합니다.

```css
@theme {
  /* Light Mode */
  --color-canvas: #fafafa;
  --color-surface-primary: #ffffff;
  --color-label-primary: #111827;
  --color-border-subtle: rgba(0, 0, 0, 0.08);

  /* Dark Mode Override */
  @custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
}

[data-theme="dark"] {
  --color-canvas: #0a0a0a;
  --color-surface-primary: #111111;
  --color-label-primary: #f9fafb;
  --color-border-subtle: rgba(255, 255, 255, 0.08);
}
```

---

## 3. 타이포그래피 (Typography)

정보 밀도를 높이기 위해 Apple의 시스템 폰트를 기반으로 하되, Linear 특유의 컴팩트한 간격을 적용합니다.

- **Font Family**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif`
- **Sizing**:
  - `Title`: `tracking-tight` (강한 시각적 위계)
  - `Body`: `text-[14px]` (기본 본문 사이즈를 약간 작게 설정하여 정보 밀도 확보)
  - `Mono**: 숫자 및 데이터 표시용 (JetBrains Mono 또는 시스템 모노)

---

## 4. UI 구성 요소 원칙 (Component Principles)

### 4.1 정보 밀도 (Linear Style)
- **Compact Spacing**: 불필요한 여백을 줄이고 데이터 간의 관계를 명확히 함.
- **Glassmorphism**: 헤더 및 사이드바에 Apple 스타일의 투명성(Blur) 적용.
- **Micro-interactions**: `Framer Motion`을 이용한 Linear 스타일의 정교한 전환 효과.

### 4.2 모서리 및 두께
- **Border Radius**: Apple 스타일의 부드러운 Curvature 적용 (기본 `10px`~`12px`).
- **Hairline Borders**: `0.5px` 또는 매우 투명한 경계선을 사용하여 깔끔한 인상 부여.

---

## 5. 구현 가이드라인

1. **유틸리티 클래스**: `className="bg-[--color-surface-primary] text-[--color-label-primary]"` 와 같이 시맨틱 토큰을 직접 참조.
2. **아이콘**: `Heroicons` (Outline)를 기본으로 하며, Apple의 SF Symbols 느낌을 주기 위해 `stroke-width`를 조절하여 사용.
3. **상태 관리**: Warning UI는 Amber 계열을 사용하되, Apple의 Alert 스타일과 Linear의 배지 스타일을 조합.

---

## 6. 반응형 및 접근성 (Responsive & Accessibility)

### 6.1 브레이크포인트 전략
Tailwind의 `sm:` (640px) 기준으로 모바일/데스크톱 분기:

| 요소 | 모바일 (< 640px) | 데스크톱 (≥ 640px) |
|:---|:---:|:---:|
| **버튼 높이** | 44px (터치 기준) | 32px (정보 밀도) |
| **입력 높이** | 44px | 32px |
| **본문 폰트** | 16px | 14px |
| **보조 폰트** | 14px | 13px |

### 6.2 rem 단위 사용
모든 폰트 크기는 `rem` 단위로 정의하여 브라우저의 기본 글꼴 크기 설정을 존중합니다:
- `--text-xs`: 0.75rem (12px)
- `--text-sm`: 0.8125rem (13px)
- `--text-base`: 0.875rem (14px)
- `--text-lg`: 1rem (16px)

### 6.3 터치 영역 (Apple HIG)
- 최소 터치 영역: 44pt (2.75rem)
- 버튼, 입력 필드, 체크박스 등 모든 인터랙티브 요소에 적용

---

## 7. Changelog
- **2026-01-06 (3차)**: 코드 품질 및 일관성 개선
  - `dark:` 접두사 완전 제거 → 시맨틱 CSS 변수 통일
  - 디자인 토큰 중앙화 (`config.ts`: DESIGN_TOKENS, SEMANTIC_COLORS)
  - Icon 컴포넌트 타입 안전성 강화 및 접근성 속성 확장
  - Skeleton/EmptyState UI 컴포넌트 추가
  - Spring 애니메이션 유틸리티 및 reduced-motion 지원
  - 모바일 네비게이션 아이콘 추가 및 터치 영역 44px 확보
- **2026-01-06 (2차)**: 반응형 + 접근성 개선
  - `px` → `rem` 전환으로 브라우저 설정 존중
  - 모바일 터치 영역 44px 확보
  - 핵심 컴포넌트 (Button, Input, Badge) 반응형 높이 적용
- **2026-01-06**: Apple(심미성) + Linear(생산성) 하이브리드 시스템으로 개편
  - 시맨틱 토큰 기반의 다크 모드 구조 확립
  - 정보 밀도를 높인 컴팩트한 타이포그래피 및 레이아웃 원칙 도입

