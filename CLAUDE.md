# Armoury, Claude Code conventions

Digital equipment checklist system for frontline teams, built on the `elleskay/platform` template.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind v4
- PostgreSQL + Drizzle ORM (Neon serverless)
- Auth.js v5 (Credentials, JWT sessions)
- Zod for all input validation
- AWS CDK: Lambda + S3 + CloudFront via OpenNext, encoded in `NextjsServerless` construct

## Layout

```
apps/web/
├── app/(app)/             # Authenticated routes (layout enforces auth)
│   ├── admin/             # role: admin
│   ├── officer/           # role: officer
│   └── dashboard/         # any authed user
├── app/login/             # public
├── app/api/auth/          # NextAuth handlers
├── app/api/health/        # health check
├── db/                    # schema, client, migrate, seed
├── lib/session.ts         # requireUser, requireAdmin, requireOfficer
├── auth.ts                # NextAuth config (uses db)
├── auth.config.ts         # Edge-safe config for middleware
├── middleware.ts          # role-aware route protection
├── components/SignOutButton.tsx  # client-side signout
└── open-next.config.ts

infra/
├── cdk/armoury/
│   ├── bin/app.ts                              # CDK app entry
│   └── lib/
│       ├── serverless-stack.ts                 # ~10 lines, uses construct
│       └── constructs/NextjsServerless.ts      # Lambda + S3 + CloudFront, encodes gotchas
└── iam/cdk-deploy-policy.json                  # least-privilege IAM

scripts/verify-deploy.sh                        # post-deploy smoke test
.github/workflows/deploy.yml                    # OIDC, build, deploy, smoke test
```

## Style

- No em dashes. Use comma, period, parens, colon.
- No emojis in code or UI strings unless explicitly requested.
- Server components by default. Add "use server" only when needed.
- All form mutations go through server actions, not API routes.
- Validate every server action input with Zod.

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT sessions, no DB session table
- Role check via `requireAdmin()` or `requireOfficer()` at the top of every server component
- Middleware redirects unauth users to `/login` and officers off `/admin/*`
- Security headers configured in `next.config.ts`

## Production gotchas (already fixed, do not regress)

1. Server Actions need `allowedOrigins` (CloudFront + Lambda URL). Read from `ALLOWED_ORIGINS` env at build time in `next.config.ts`.
2. `AUTH_URL` env var must be set on the Lambda or NextAuth redirects to the Lambda function URL.
3. Sign-out uses client-side `signOut` from `next-auth/react`, NOT a server-action form. Server-action signout doesn't clear cookies through OpenNext streaming.
4. `open-next build` must run before `cdk synth/bootstrap/deploy` because the construct references `.open-next/` assets.
5. CDK env vars are baked at synth time. Set them in the shell that runs `cdk deploy`.

## Common edits

- New page: add under `app/(app)/...`, call `requireUser/Admin/Officer` first
- New mutation: server action in `actions.ts` next to the page, Zod-validated
- New table: edit `db/schema.ts`, run `npm run db:generate`, commit migration
- New CDK resource: edit `infra/cdk/armoury/lib/serverless-stack.ts` or extend the construct

## Deploy

### Local
```bash
cd apps/web && DATABASE_URL=... AUTH_SECRET=... AUTH_URL=... ALLOWED_ORIGINS=... npm run build:open-next
cd ../../infra/cdk/armoury && DATABASE_URL=... AUTH_SECRET=... AUTH_URL=... npx cdk deploy --all
./scripts/verify-deploy.sh <distribution-url>
```

### CI
Push to `main` triggers `.github/workflows/deploy.yml`. Requires AWS_DEPLOY_ROLE_ARN, DATABASE_URL, AUTH_SECRET secrets and AWS_REGION, APP_URL, ALLOWED_ORIGINS variables on the repo.

## What this is NOT

- Not multi-tenant beyond teams. No org boundary enforcement.
- Not production-hardened. A real system would add audit logs, fine-grained permissions, mobile apps, offline mode.
