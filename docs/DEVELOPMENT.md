# 개발 가이드

이 프로젝트는 **Vue 3 + Vite** 기반의 프론트엔드와 **Netlify Functions**를 이용한 서버리스 백엔드로 구성되어 있습니다.

## 🚀 서버 실행 (중요)

반드시 **Netlify Dev**를 사용하여 서버를 실행해야 합니다.

```bash
npm run dev:netlify
```

*   **포트**: `8888` (Vite의 3000/5173 아님)
*   **이유**: 인증(Netlify Identity) 및 데이터베이스(FaunaDB/MongoDB 등) 연결을 위한 환경 변수와 프록시 설정이 `netlify dev`를 통해서만 로드되기 때문입니다.
*   `npm run dev`로 실행 시 로그인 페이지에서 리다이렉트가 제대로 동작하지 않거나 API 호출이 실패합니다.

## 📁 프로젝트 구조

*   `src/`: Vue 프론트엔드 소스 코드
*   `netlify/functions/`: 서버리스 백엔드 함수
*   `.agent/workflows/`: Antigravity 에이전트 워크플로우

## 🛠️ 주요 스크립트

*   `npm run dev:netlify`: **(권장)** 개발 서버 실행 (Port 8888)
*   `npm run dev`: 프론트엔드 단독 실행 (로그인 불가)
*   `npm run build`: 프로덕션 빌드
*   `npm run type-check`: TypeScript 타입 체크
*   `npm run lint`: 린트 체크
