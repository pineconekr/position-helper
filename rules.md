# 개발 규칙 (Development Rules)

## 1. 파일 구조 및 명명 규칙
- **기능 격리 (Feature Isolation)**: 특정 기능과 관련된 코드는 반드시 `src/features/<feature-name>` 내부에 위치해야 합니다.
- **공유 코드 (Shared Code)**: 진정으로 범용적인 코드만 `src/shared`에 배치합니다.
- **명명 규칙**:
    - 컴포넌트: PascalCase (예: `MemberCard.tsx`)
    - 훅: camelCase (예: `useTheme.ts`)
    - 유틸리티: camelCase (예: `dateUtils.ts`)
- **내보내기 (Exports)**: Tree-shaking과 리팩토링 용이성을 위해 `default export` 대신 `named export`를 사용합니다.

## 2. 코딩 표준
- **TypeScript**:
    - Strict 모드 활성화.
    - `any` 사용 금지; 런타임 검증을 위해 `zod` 사용 권장.
    - 인터페이스/타입은 별도의 `types.ts` 또는 해당 컴포넌트 옆에 정의합니다.
- **컴포넌트 작성**:
    - 모든 컴포넌트는 **함수형 컴포넌트**로 작성합니다.
- **주석**:
    - 코드 내 모든 주석은 **한글**로 작성합니다.
- **상태 관리**:
    - **지역 상태 (Local)**: UI 전용 상태는 `useState` 사용.
    - **전역 상태 (Global)**: 여러 기능에서 공유되는 데이터(팀원, 배정 정보 등)는 Zustand 사용.
    - **비동기 상태**: `useEffect` 또는 React Query 사용 고려.

## 3. 디자인 시스템 및 CSS
- **하드코딩 금지**: 반드시 `theme.css`에 정의된 CSS 변수를 사용하세요.
    - ✅ `color: var(--color-text-primary);`
    - ❌ `color: #333;`
- **스타일링**: **CSS Modules** 사용을 원칙으로 합니다.
- **다크 모드**: 모든 UI 컴포넌트는 라이트/다크 모드 모두에서 테스트해야 합니다.

## 4. Git 및 커밋 규칙
- **메시지**: Conventional Commits 스타일 준수 (예: `feat: add assignment board`, `fix: correct typo in rules`).
- **원자적 작업**: 하나의 기능을 완료하거나 하나의 버그를 수정할 때마다 커밋합니다.

## 5. Tauri 관련 주의사항
- **파일 접근**: 모든 파일 I/O는 Tauri API를 추상화한 데이터 레이어를 통해 수행합니다.
- **보안**: 엄격히 필요한 경우가 아니면 위험한 Tauri API 권한을 활성화하지 않습니다.