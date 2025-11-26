# Position Helper Design System

## 개요
이 프로젝트는 의미론적(semantic) 토큰 기반의 디자인 시스템을 사용하여 일관된 UI와 테마(Light/Dark)를 제공합니다.

## 아키텍처

### 1. 디자인 토큰 (`src/theme/theme.css`)
모든 색상, 간격, 그림자, 모션은 CSS 변수(Custom Properties)로 정의되어 있습니다.
- **Palette**: `--color-canvas`, `--color-surface-1`, `--color-surface-2`
- **Text**: `--color-text-primary`, `--color-text-muted`
- **Semantic**: `--color-accent`, `--color-critical`, `--color-success`
- **Chart**: `--data-series-1~6`, `--data-positive/negative`

### 2. 테마 관리 (`src/theme/ThemeProvider.tsx`)
- `ThemeProvider` 컴포넌트가 앱 최상위를 감싸며, `data-theme="light|dark"` 속성을 `<html>` 태그에 동기화합니다.
- `useTheme()` 훅을 통해 현재 테마 상태에 접근하거나 토글할 수 있습니다.
- 시스템 설정(`prefers-color-scheme`)을 지원합니다.

### 3. UI 컴포넌트 (`src/components/ui/`)
재사용 가능한 기본 컴포넌트들이 정의되어 있습니다.
- `Button`: `variant="primary|secondary|ghost|critical"`, `size="sm|md"`
- `Badge`: `variant="neutral|accent|critical|success|warning"`
- `Panel`: 기본 컨테이너 (Card 스타일)
- `Input`, `Textarea`: 기본 스타일링된 폼 요소

### 4. 차트 색상 (`src/theme/chartColors.ts`)
- Plotly 등 JS 기반 차트 라이브러리에서 CSS 변수를 참조하기 위한 헬퍼 함수 `getChartPalette()`를 제공합니다.
- 테마 변경 시 자동으로 색상이 업데이트됩니다.

## 개발 가이드

### 새로운 컴포넌트 스타일링
1. **UI 컴포넌트 우선 사용**: 가능한 경우 `src/components/ui`의 컴포넌트를 사용하세요.
2. **CSS 변수 사용**: 색상 값을 하드코딩하지 말고 `var(--color-*)` 토큰을 사용하세요.
3. **Panel 사용**: 배경과 보더가 있는 컨테이너는 `Panel` 컴포넌트나 `.panel` 클래스를 사용하세요.

### 차트 추가 시
```typescript
import { useTheme } from '../theme/ThemeProvider';
import { getChartPalette } from '../theme/chartColors';

// 컴포넌트 내부
const { theme } = useTheme();
const [palette, setPalette] = useState(getChartPalette());

useEffect(() => {
    // 테마 변경 감지 후 팔레트 업데이트
    setPalette(getChartPalette());
}, [theme]);

// Plot layout 설정 시 palette.text, palette.grid 등을 사용
```

## 폴더 구조
```
src/
  theme/
    theme.css       # 전역 토큰 및 스타일
    tokens.ts       # 타입 정의
    ThemeProvider.tsx # 테마 컨텍스트
    chartColors.ts  # 차트 색상 유틸
  components/
    ui/             # 공통 UI 프리미티브 (Button, Badge 등)
```

