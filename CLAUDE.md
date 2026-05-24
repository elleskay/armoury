# Armoury, Claude Code conventions

Digital equipment checklist system for frontline teams, built on the `elleskay/platform` template.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind v4
- PostgreSQL + Drizzle ORM (Neon serverless)
- Auth.js v5 (Credentials, JWT sessions)
- Zod for all input validation
- AWS CDK for infra. Default: Lambda + CloudFront + S3 via OpenNext. Alternative: ECS Fargate + RDS + ALB.

## Layout

```
apps/web/
├── app/(app)/             # Authenticated routes (layout enforces auth)
│   ├── admin/             # role: admin
│   ├── officer/           # role: officer
│   └── dashboard/         # any authed user
├── app/login/             # public
├── app/api/auth/          # NextAuth handlers
├── app/api/health/        # health check (used by Fargate alt path)
├── db/                    # schema, client, migrate, seed
├── lib/session.ts         # requireUser, requireAdmin, requireOfficer
├── auth.ts                # NextAuth config (uses db)
├── auth.config.ts         # Edge-safe config for middleware
├── middleware.ts          # role-aware route protection
├── open-next.config.ts    # OpenNext serverless build config
└── Dockerfile             # used only for the Fargate alternative

infra/cdk/
├── base/                  # platform stacks (don't touch in this app)
└── armoury/
    ├── bin/app.ts                 # deploys ServerlessStack by default
    ├── lib/serverless-stack.ts    # Lambda + CloudFront + S3 (default)
    └── lib/service-stack.ts       # ECS Fargate + RDS + ALB (alternative)
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

## Common edits

- New page: add under `app/(app)/...`, call `requireUser/Admin/Officer` first
- New mutation: server action in `actions.ts` next to the page, Zod-validated
- New table: edit `db/schema.ts`, run `npm run db:generate`, commit migration
- New CDK resource: edit `infra/cdk/armoury/lib/*.ts`

## Deploy

- Default: serverless. `cd apps/web && npm run build:open-next` then `cd infra/cdk/armoury && npx cdk deploy --all`
- Alternative: Fargate. Build the Dockerfile, push to ECR, deploy the service stack.

## What this is NOT

- Not multi-tenant beyond teams. No org boundary enforcement.
- Not production-hardened. A real system would add audit logs, fine-grained permissions, mobile apps, offline mode, etc.
