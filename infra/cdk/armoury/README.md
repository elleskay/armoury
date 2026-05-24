# Armoury CDK

Per-app AWS infrastructure for the Armoury Next.js app.

## Stacks

Two patterns shipped, pick one. `bin/app.ts` deploys the serverless stack by default.

### Default: Serverless

- `ArmouryServerless` (in `lib/serverless-stack.ts`)
  - Lambda function (server) with response streaming, ARM64
  - Lambda function (image optimization), ARM64
  - S3 bucket for static assets, served via CloudFront
  - CloudFront distribution routing `/_next/static/*` and `/favicon.ico` to S3, `/_next/image*` to the image Lambda, everything else to the server Lambda

Costs roughly $0-2/month idle. Connects to Postgres over public TLS (Neon).

### Alternative: Fargate

- `ArmouryDatabase` and `ArmouryService` (in `lib/database-stack.ts` and `lib/service-stack.ts`)
  - RDS Postgres in the platform VPC's isolated subnet
  - ECS Fargate service running the Next.js standalone container behind an ALB
  - Image pulled from the platform ECR repository

Costs roughly $95/month idle. Use when you need always-on, steady traffic, websockets, or background work.

## Setup (one-time)

```bash
npm ci
npx cdk bootstrap aws://<account>/<region>
```

## Deploy serverless (default)

Build the Next.js app with OpenNext first, then deploy:

```bash
cd ../../../apps/web
DATABASE_URL="postgres://..." AUTH_SECRET="..." npm run build:open-next

cd ../../infra/cdk/armoury
DATABASE_URL="postgres://..." AUTH_SECRET="..." npx cdk deploy --all
```

The CDK outputs a `DistributionUrl`, that's the public site URL.

## Deploy Fargate (alternative)

Switch `bin/app.ts` to instantiate `DatabaseStack` and `ServiceStack` instead of `ServerlessStack`. Then:

```bash
# Deploy platform base stacks first (one-time)
cd ../../../infra/cdk/base
npx cdk deploy --all

# Build and push container
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t platform/apps:armoury-latest -f ../../../apps/web/Dockerfile ../../../apps/web
docker tag platform/apps:armoury-latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/platform/apps:armoury-latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/platform/apps:armoury-latest

# Deploy app stacks
cd ../../infra/cdk/armoury
npx cdk deploy --all
```
