# StudioOS — web client

React + TypeScript single-page application for StudioOS. See the [root README](../../README.md) for the product overview and full setup.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on http://localhost:5173 (proxies `/api` to `VITE_STUDIOOS_API_PROXY_TARGET`) |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run generate-client` | Regenerate `src/api/studioos-api.ts` from the running API's OpenAPI schema |

## Structure

```
src/
├── api/          generated API client (do not edit by hand)
├── app/pages/    route-level pages, one folder per feature
├── auth/         session and permission handling
├── components/
│   ├── ui/       shadcn/ui primitives
│   ├── layout/   app shell, sidebar, page header
│   └── shared/   reusable feature components
├── hooks/        shared React hooks
├── i18n/         translations (pt, en)
├── lib/          utilities
└── theme/        theme provider (light/dark)
```

UI conventions are documented in [UI_GUIDELINES.md](UI_GUIDELINES.md).
