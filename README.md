# Armoury

Digital equipment checklist system for frontline teams: fire stations, checkpoints, hospitals, prisons. Admins author checklists, officers fill them in on shift, and a central dashboard tracks compliance and open issues.

## What it does

- Admins create checklist templates (e.g. "Fire Truck Daily Check") with items of three kinds: yes/no, text, number
- Templates are assigned to teams (FRS, ICA, SPS, hospital)
- Officers see their team's checklists and submit responses, optionally flagging issues per item
- A dashboard shows compliance rate, recent submissions, open issues, and per-team breakdown

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 |
| Database | PostgreSQL via Drizzle ORM (Neon for serverless deploy) |
| Auth | Auth.js v5 (Credentials provider, JWT sessions, role-based middleware) |
| Validation | Zod on every server action |
| Infra (default) | AWS Lambda + CloudFront + S3 via OpenNext + CDK |
| Infra (alt) | AWS ECS Fargate + RDS + ALB (still in `infra/cdk/armoury/lib/service-stack.ts`) |
| CI | GitHub Actions: typecheck, lint, build, CodeQL, gitleaks, npm audit |

Built on the platform template at https://github.com/elleskay/platform.

## Local development

```bash
# 1. Install deps
npm install

# 2. Point DATABASE_URL at a Postgres (Neon serverless is the easiest)
cp apps/web/.env.example apps/web/.env.local
# Edit DATABASE_URL and AUTH_SECRET

# 3. Migrate and seed
cd apps/web
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Run
npm run dev
```

Visit http://localhost:3000 and sign in as `admin@armoury.test` or `officer@armoury.test` (password: `password123`).

## Architecture

```
armoury/
├── apps/web/                       # Next.js app (frontend + API routes + server actions)
│   ├── app/
│   │   ├── (app)/                  # Authenticated pages
│   │   │   ├── admin/              # Admin only routes
│   │   │   ├── officer/            # Officer routes
│   │   │   └── dashboard/          # Any authed user
│   │   ├── login/
│   │   └── api/                    # NextAuth + health
│   ├── db/                         # Drizzle schema, client, migrate, seed
│   ├── lib/                        # Session helpers
│   ├── auth.ts                     # NextAuth config
│   ├── auth.config.ts              # Edge-safe config for middleware
│   ├── middleware.ts               # Route protection
│   ├── open-next.config.ts         # OpenNext build config
│   └── Dockerfile                  # Production container (Fargate alternative)
├── infra/cdk/
│   ├── base/                       # From platform template: VPC, IAM, ECR, Secrets
│   └── armoury/
│       ├── lib/serverless-stack.ts # Lambda + CloudFront + S3 (default)
│       └── lib/service-stack.ts    # ECS Fargate + ALB + RDS (alternative)
└── .github/workflows/              # From platform template
```

## Security

- Strict security headers (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy)
- Input validation via Zod on every server action
- Bcrypt password hashing
- JWT sessions (no DB session table to leak)
- Dependency scanning via Dependabot
- Code scanning via CodeQL
- Secret scanning via gitleaks

See `docs/SSDLC.md` for the full secure-development inventory.

## Deploy

### Default: Serverless on AWS (Lambda + CloudFront via OpenNext)

```bash
cd apps/web
DATABASE_URL=... AUTH_SECRET=... npm run build:open-next

cd ../../infra/cdk/armoury
npm ci
npx cdk bootstrap aws://<account>/<region>      # one-time per account/region
DATABASE_URL=... AUTH_SECRET=... npx cdk deploy --all
```

CDK outputs `DistributionUrl` (the public CloudFront URL). Idle cost ~$0-2/month.

### Alternative: ECS Fargate

If you need always-on containers (steady traffic, websockets, etc), use the Fargate stack instead. See `infra/cdk/armoury/README.md` for the build+push and deploy commands. Idle cost ~$95/month.

## License

MIT.
