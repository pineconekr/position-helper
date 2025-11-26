# Motion System Guidelines

## 1. 개요
이 문서는 Position Helper 프로젝트의 애니메이션 시스템을 정의합니다.
일관된 사용자 경험과 접근성(Reduced Motion)을 보장하기 위해, 모든 모션은 본 가이드라인과 제공된 토큰/유틸리티를 따라야 합니다.

## 2. 모션 토큰 (Design Tokens)

### 2.1 Duration (지속 시간)
`src/theme/theme.css`에 정의되어 있으며, CSS 변수 또는 TS 유틸을 통해 사용합니다.

| Token Name | Value (ms) | CSS Variable | 용도 |
| :--- | :--- | :--- | :--- |
| `fast` | **150ms** | `--motion-duration-fast` | 마이크로 인터랙션 (Hover, Click, Toggle) |
| `normal` | **250ms** | `--motion-duration-normal` | 일반적인 UI 변화 (Toast, Dialog, Panel 확장) |
| `slow` | **400ms** | `--motion-duration-slow` | 큰 레이아웃 변화 (Page Transition, Drawer) |

### 2.2 Easing (가속도)
| Token Name | CSS Value | CSS Variable | 용도 |
| :--- | :--- | :--- | :--- |
| `default` | `cubic-bezier(0.4, 0, 0.2, 1)` | `--motion-ease-default` | 표준 UI 트랜지션 (Material Design Standard) |
| `in` | `cubic-bezier(0.4, 0, 1, 1)` | `--motion-ease-in` | 화면에서 사라질 때 (Exit) |
| `out` | `cubic-bezier(0, 0, 0.2, 1)` | `--motion-ease-out` | 화면에 나타날 때 (Enter) |

---

## 3. 구현 가이드 (Implementation)

### 3.1 CSS / SCSS 사용
`var()` 함수를 사용하여 토큰을 직접 참조합니다.
`prefers-reduced-motion: reduce` 환경에서는 `:root` 레벨에서 모든 duration이 `0s`로 재정의되므로, 별도의 미디어 쿼리가 필요 없습니다.

```css
.button {
  transition: background-color var(--motion-duration-fast) var(--motion-ease-default);
}

.panel {
  transition: transform var(--motion-duration-normal) var(--motion-ease-out);
}
```

### 3.2 React / Framer Motion 사용
`useMotionConfig` 훅을 사용하여 설정값을 가져옵니다. 이 훅은 접근성 설정(`prefers-reduced-motion`)을 자동으로 감지하여 duration을 0으로 만들거나 조건부 렌더링 플래그(`shouldReduce`)를 제공합니다.

```tsx
import { motion } from 'framer-motion';
import { useMotionConfig } from '@/utils/motion';

export function MyComponent() {
  const { duration, ease } = useMotionConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.normal, ease: ease.out }}
    >
      Content
    </motion.div>
  );
}
```

### 3.3 접근성 (Accessibility)
- **CSS**: `theme.css`가 자동으로 처리합니다.
- **JS**: `useMotionConfig()`의 `duration` 값은 `reduce` 모드에서 자동으로 `0`이 됩니다.
- **레이아웃 이동 방지**: 모션이 제거될 때 요소가 점프하는 것을 방지하기 위해, `shouldReduce` 플래그를 사용하여 `initial/exit` 상태의 `transform` 값을 조정할 수 있습니다.

```tsx
const { shouldReduce, duration } = useMotionConfig();

const variants = {
  initial: shouldReduce ? { opacity: 1 } : { opacity: 0, y: 20 },
  // ...
};
```

---

## 4. 마이그레이션 노트
- 기존 `quick` (0.16s), `medium` (0.22s), `slow` (0.36s) 값들은 각각 `fast`, `normal`, `slow` 토큰으로 통합되었습니다.
- 코드베이스에서 하드코딩된 `0.15s`, `0.2s` 등은 모두 토큰으로 대체되었습니다.
