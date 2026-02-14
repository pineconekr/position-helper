# 고등부 영상팀 포지션 배정 도우미

주간 영상팀 역할 배정을 빠르고 공정하게 운영하기 위한 웹 앱입니다.

## 단일 기준 문서 (SSOT)

프로젝트 방향성, 아키텍처, 워크플로우, 품질 게이트의 최신 기준은 아래 문서 1개를 따릅니다.

- `docs/PROJECT_PLAYBOOK.md`

## 빠른 시작

```bash
npm ci
npm run dev:netlify
```

- 개발 주소: `http://localhost:8888`
- 주의: `npm run dev`는 프론트엔드 단독 실행이며 인증/API 플로우가 정상 동작하지 않을 수 있습니다.

## 검증 명령

```bash
npm run type-check
npm run build
npm audit --audit-level=high
```
