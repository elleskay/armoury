# Armoury CDK

Per-app AWS infrastructure for the Armoury Next.js service.

## Stacks

- `ArmouryDatabase` — RDS Postgres in private isolated subnet of the platform VPC
- `ArmouryService` — ECS Fargate service running the Next.js standalone container behind an ALB, pulling image from the platform ECR repository

## Depends on

The platform base stacks must be deployed first:

```bash
cd ../../../infra/cdk/base
npx cdk deploy --all
```

## Deploy

```bash
npm ci
npx cdk deploy --all
```

## Container image

Build and push to ECR:

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t platform/apps:armoury-latest -f ../../../apps/web/Dockerfile ../../../apps/web
docker tag platform/apps:armoury-latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/platform/apps:armoury-latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/platform/apps:armoury-latest
```
