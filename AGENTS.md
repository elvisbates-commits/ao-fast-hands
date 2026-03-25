# AGENTS

## Vercel Deployment Safety Rule

When writing or changing code in this repository, always verify the project is safe to deploy on Vercel before submitting work.

Required checks before submission/deployment:

1. Run `npm run build` and confirm it exits successfully.
2. Fix all TypeScript or build errors (especially `tsc` errors) before submitting.
3. Do not deploy or mark work as complete if the build fails.
4. Prefer changes that are compatible with Vite/Vercel production builds, not only local dev mode.

If any check fails, continue iterating until the build passes.
