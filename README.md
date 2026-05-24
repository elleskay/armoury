# Armoury

Digital equipment checklist system. OGP Armoury-inspired portfolio app, built on the `elleskay/platform` template.

## What it does

- Admins create checklist templates (e.g. "Fire Truck Daily Check") with items of three kinds: yes/no, text, number.
- Templates are assigned to teams (FRS, ICA, SPS, hospital).
- Officers see their team's checklists and submit responses, optionally flagging issues per item.
- A dashboard shows compliance rate, recent submissions, open issues, and per-team breakdown.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Auth.js v5 (Credentials provider, JWT sessions, role-based middleware) |
| Validation | Zod on every server action |
| Infra | AWS CDK: RDS Postgres + ECS Fargate behind ALB, image from platform ECR |
| CI | GitHub Actions: typecheck, lint, build, CodeQL, gitleaks, npm audit |

Built on the platform template at https://github.com/elleskay/platform.

## Local development

```bash
# 1. Install deps
npm install

# 2. Start Postgres (or point DATABASE_URL elsewhere)
docker run --name armoury-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=armoury -p 5432:5432 -d postgres:16

# 3. Configure env
cp apps/web/.env.example apps/web/.env.local
# Edit DATABASE_URL and AUTH_SECRET

# 4. Migrate and seed
cd apps/web
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev
```

Visit http://localhost:3000 and sign in as `admin@armoury.test` or `officer@armoury.test` (password: `password123`).

## Architecture

```
armoury/
├── apps/web/              # Next.js app (frontend + API routes)
│   ├── app/               # App Router pages and routes
│   │   ├── (app)/         # Authenticated pages (layout enforces session)
│   │   │   ├── admin/     # Admin only routes
│   │   │   ├── officer/   # Officer routes
│   │   │   └── dashboard/
│   │   ├── login/
│   │   └── api/
│   ├── db/                # Drizzle schema, client, migrate, seed
│   ├── lib/               # Session helpers
│   ├── auth.ts            # NextAuth config (with adapter)
│   ├── auth.config.ts     # Edge-safe NextAuth config for middleware
│   ├── middleware.ts      # Route protection
│   └── Dockerfile         # Production container
├── infra/cdk/
│   ├── base/              # From platform template: VPC, IAM, ECR, Secrets
│   └── armoury/           # App-specific: RDS Postgres + ECS Fargate
└── .github/workflows/     # From platform template
```

## Security

Inherits the platform template's controls:

- Strict security headers (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy)
- Input validation via Zod on every server action
- Bcrypt password hashing
- JWT sessions (no DB session table to leak)
- Dependency scanning via Dependabot
- Code scanning via CodeQL
- Secret scanning via gitleaks

See `docs/SSDLC.md` for the full secure-development inventory.

## Deploy

This app deploys to AWS via CDK. The platform base stacks (`PlatformNetwork`, `PlatformRegistry`, `PlatformSecrets`) must be deployed first.

```bash
cd infra/cdk/base && npm ci && npx cdk deploy --all
cd ../armoury && npm ci && npx cdk deploy --all
```

Then push a container image to the platform ECR repository tagged `armoury-latest`. See `infra/cdk/armoury/README.md` for the build/push commands.

## License

MIT.
