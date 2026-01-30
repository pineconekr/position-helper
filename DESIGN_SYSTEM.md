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

## 7. Stitch 디자인 통합 가이드

### 7.1 색상 매핑 테이블 (다크모드 전면 적용)
Stitch "이거어때" 다크모드 디자인이 globals.css에 완전 적용되었습니다.

#### 시맨틱 토큰 (커스텀)
| 모드 | 역할 | 토큰 | 적용값 | WCAG AA |
|:---|:---|:---|:---|:---:|
| Light | Background | `--color-canvas` | `#f6f6f8` | ✅ |
| Light | Accent | `--color-accent` | `#2b4bee` | ✅ |
| **Dark** | **Background** | `--color-canvas` | **`#101322`** | ✅ |
| **Dark** | **Accent** | `--color-accent` | **`#5b6cf9`** | ✅ |

#### shadcn-vue 토큰 (Tailwind 클래스용)
| 모드 | Tailwind 클래스 | 토큰 | 적용값 |
|:---|:---|:---|:---|
| Light | `bg-background` | `--background` | `#f6f6f8` |
| Light | `bg-card` | `--card` | `#ffffff` |
| Light | `text-primary` | `--primary` | `#2b4bee` |
| Light | `bg-muted` | `--muted` | `#f3f4f6` |
| **Dark** | `bg-background` | `--background` | **`#101322`** |
| **Dark** | `bg-card` | `--card` | **`#1f2937`** |
| **Dark** | `text-primary` | `--primary` | **`#5b6cf9`** |
| **Dark** | `bg-muted` | `--muted` | **`#374151`** |


### 7.2 다크모드 호환성
- Stitch 디자인은 Tailwind의 `dark:` 클래스를 사용합니다.
- Position Helper는 `.dark` 클래스 선택자를 사용합니다.
- **호환됨**: Tailwind v4에서 `darkMode: "class"`가 기본 설정이므로 `.dark` 클래스와 `dark:` 접두사가 연동됩니다.

### 7.3 폰트 전략
- Stitch: "Plus Jakarta Sans"
- Position Helper: "Pretendard" (한국어 최적화)
- **권장**: Pretendard 유지. 필요시 영문에만 Jakarta 적용 (`@font-face` 분리)

---

## 8. 접근성 가이드라인 (WCAG 2.1 AA)

### 8.1 색상 대비율
- **텍스트**: 배경 대비 최소 4.5:1
- **대형 텍스트 (18px+)**: 최소 3:1
- 모든 시맨틱 토큰은 WCAG AA 대비율 충족

### 8.2 포커스 표시 (focus-visible)
```css
/* globals.css에 정의됨 */
.interactive-base:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```
모든 클릭 가능한 요소에 `focus-visible` 스타일 적용 필수.

### 8.3 터치 타겟
- 최소 크기: **44px × 44px** (Apple HIG 기준)
- 유틸리티 클래스: `.touch-target` 또는 `min-h-[44px]`

### 8.4 ARIA 속성
- **네비게이션**: `aria-current="page"` (활성 링크)
- **아이콘 버튼**: `aria-label="설명"` 필수
- **장식용 아이콘**: `aria-hidden="true"`

### 8.5 체크리스트
- [ ] 모든 이미지에 `alt` 속성
- [ ] 아이콘 버튼에 `aria-label`
- [ ] 네비게이션에 `aria-current`
- [ ] 색상만으로 정보 전달하지 않음 (아이콘/텍스트 병행)
- [ ] 키보드로 모든 기능 접근 가능

---

## 9. Changelog
- **2026-01-30 (2차)**: Stitch 다크모드 전면 적용 및 레이아웃 교체
  - **shadcn-vue 토큰 통합**: `--background`, `--card`, `--primary` 등 모든 토큰을 Stitch 팔레트로 교체
  - **다크모드 색상**: `#101322` (배경), `#1f2937` (카드), `#5b6cf9` (액센트)
  - **AppShell.vue Stitch 스타일 적용**: 
    - 헤더 높이 h-12 → h-16
    - 네비게이션 Pill 스타일 (`bg-muted` + `rounded-full`)
    - 로고 그림자 (`shadow-lg shadow-primary/30`)
    - 최대 너비 1600px로 확장
  - **shadcn Tailwind 클래스 사용**: `bg-background`, `bg-card`, `text-foreground` 등으로 통일
- **2026-01-30**: Stitch 디자인 통합 및 WCAG 2.1 AA 접근성 가이드라인 추가
  - Stitch 색상 매핑 테이블 작성
  - AppShell.vue에 `aria-current`, `aria-hidden` 적용
  - 접근성 체크리스트 및 가이드라인 문서화
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
