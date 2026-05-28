import { NextResponse } from "next/server";

// Stable per-deploy version hash. Use VERCEL_GIT_COMMIT_SHA or
// AWS_LAMBDA_FUNCTION_VERSION when set; falls back to a build-time
// timestamp baked into the module load.
const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.AWS_LAMBDA_FUNCTION_VERSION ??
  process.env.GITHUB_SHA ??
  new Date().toISOString();

export async function GET() {
  return NextResponse.json({ version: BUILD_VERSION });
}
