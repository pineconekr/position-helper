# 개발 가이드

Last Updated: 2026-02-06
Status: Consolidated

개발 절차와 아키텍처 기준은 단일 문서로 통합되었습니다.

- `docs/PROJECT_PLAYBOOK.md`

핵심 실행만 빠르게 참고:

```bash
npm ci
npm run dev:netlify
```

검증:

```bash
npm run type-check
npm run build
npm audit --audit-level=high
```
