import { Shield } from "lucide-react";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function loginAction(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent(error.type)}`);
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[20rem] w-[20rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Armoury</h1>
          <p className="text-sm text-muted-foreground">
            Digital equipment checklists for frontline teams.
          </p>
        </div>

        <Card>
          <form action={loginAction}>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Use your team credentials to continue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sp.error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Invalid email or password.
                </div>
              )}
              <input type="hidden" name="callbackUrl" value={sp.callbackUrl ?? "/dashboard"} />
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@armoury.test"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full">
                Sign in
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo: admin@armoury.test or officer@armoury.test (password: password123)
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
