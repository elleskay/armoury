# Armoury

Digital equipment checklist system for frontline teams: fire stations, checkpoints, hospitals, prisons. Admins author checklists, officers fill them in on shift, and a central dashboard tracks compliance and open issues.

**Live:** https://d1aeysqic3xk9.cloudfront.net

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
| Database | PostgreSQL via Drizzle ORM (Neon for serverless) |
| Auth | Auth.js v5 (Credentials, JWT, role-aware middleware) |
| Validation | Zod on every server action |
| Build adapter | OpenNext |
| Infra | AWS Lambda + S3 + CloudFront via AWS CDK |
| CI | GitHub Actions (typecheck, lint, build, CodeQL, gitleaks, npm audit) |
| Deploy | GitHub Actions workflow with OIDC + smoke test |

Built on the platform template at https://github.com/elleskay/platform.

## Local development

```bash
# 1. Install
npm install

# 2. Point DATABASE_URL at a Postgres
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

Sign in at http://localhost:3000 as `admin@armoury.test` or `officer@armoury.test` (password: `password123`).

## Architecture

```
armoury/
├── apps/web/                              # Next.js app
│   ├── app/
│   │   ├── (app)/                         # Authenticated pages
│   │   │   ├── admin/                     # role: admin
│   │   │   ├── officer/                   # role: officer
│   │   │   └── dashboard/                 # any authed user
│   │   ├── login/
│   │   └── api/                           # NextAuth + health
│   ├── db/                                # Drizzle schema, client, migrate, seed
│   ├── lib/                               # Session helpers
│   ├── auth.ts                            # NextAuth config (uses db)
│   ├── auth.config.ts                     # Edge-safe config for middleware
│   ├── middleware.ts                      # Role-aware route protection
│   ├── components/SignOutButton.tsx       # Client signout (not server action)
│   └── open-next.config.ts
├── infra/
│   ├── cdk/armoury/
│   │   ├── bin/app.ts                     # CDK app entry
│   │   └── lib/
│   │       ├── serverless-stack.ts        # ~10 lines: uses NextjsServerless construct
│   │       └── constructs/
│   │           └── NextjsServerless.ts    # Lambda + S3 + CloudFront, encodes all gotchas
│   └── iam/cdk-deploy-policy.json         # Least-privilege IAM policy
├── scripts/verify-deploy.sh               # Post-deploy smoke test
└── .github/workflows/
    ├── ci.yml
    ├── security.yml
    └── deploy.yml                         # OIDC auth + build + cdk deploy + smoke test
```

## Security

- Strict security headers (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy)
- Input validation via Zod on every server action
- Bcrypt password hashing (10 rounds)
- JWT sessions (no DB session table to leak)
- Dependency scanning via Dependabot
- Code scanning via CodeQL
- Secret scanning via gitleaks

## Deploy

### Local deploy (you run cdk yourself)

```bash
# 1. Build the Next.js app with OpenNext
cd apps/web
DATABASE_URL="..." AUTH_SECRET="..." AUTH_URL="https://your-cf-url" ALLOWED_ORIGINS="your-cf-host,your-lambda-host" npm run build:open-next

# 2. Deploy CDK
cd ../../infra/cdk/armoury
npm ci
npx cdk bootstrap aws://<account>/<region>   # one-time per account/region
DATABASE_URL="..." AUTH_SECRET="..." AUTH_URL="https://your-cf-url" npx cdk deploy --all

# 3. Smoke test
cd ../../..
./scripts/verify-deploy.sh https://your-cf-url
```

### Auto deploy via GitHub Actions

Set these in the GitHub repo (Settings, Secrets and variables, Actions):

| Setting | Type | Value |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | secret | OIDC role ARN |
| `DATABASE_URL` | secret | Postgres connection string |
| `AUTH_SECRET` | secret | `openssl rand -base64 32` |
| `AWS_REGION` | variable | `ap-southeast-1` |
| `APP_URL` | variable | https://d1aeysqic3xk9.cloudfront.net (or your custom domain) |
| `ALLOWED_ORIGINS` | variable | CloudFront host + Lambda URL host, comma-separated |

Once configured, every push to `main` triggers `.github/workflows/deploy.yml`: build → cdk deploy → smoke test.

For the IAM role policy, use `infra/iam/cdk-deploy-policy.json` instead of `AdministratorAccess`.

## Cost

- Lambda Free Tier covers 1M req/month
- CloudFront Free Tier covers 1TB transfer
- Neon Postgres free tier
- Realistic idle: ~$0-2/month

## License

MIT.
