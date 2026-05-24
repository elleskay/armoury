# Armoury, Claude Code conventions

OGP Armoury-inspired digital equipment checklist system, built on the `elleskay/platform` template.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind v4
- PostgreSQL + Drizzle ORM
- Auth.js v5 (Credentials, JWT sessions)
- Zod for all input validation
- AWS CDK for infra (RDS + ECS Fargate)

## Layout

```
apps/web/
├── app/(app)/             # Authenticated routes (layout enforces auth)
│   ├── admin/             # role: admin
│   ├── officer/           # role: officer
│   └── dashboard/         # any authed user
├── app/login/             # public
├── app/api/auth/          # NextAuth handlers
├── app/api/health/        # health check for ALB
├── db/                    # schema, client, migrate, seed
├── lib/session.ts         # requireUser, requireAdmin, requireOfficer
├── auth.ts                # NextAuth config (uses db)
├── auth.config.ts         # Edge-safe config for middleware
└── middleware.ts          # role-aware route protection

infra/cdk/
├── base/                  # platform stacks (don't touch in this app)
└── armoury/               # app-specific: DatabaseStack, ServiceStack
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

## What this is NOT

- Not the real Armoury. This is a portfolio clone of the OGP product.
- Not multi-tenant beyond teams. No org boundary enforcement.
- Not production-hardened. Real Armoury would have audit logs, fine-grained permissions, mobile apps, offline mode, etc.
