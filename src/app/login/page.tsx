import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import LoginFormDebug from "./login-form-debug";

export default async function LoginPage() {
  const session = await auth();

  // Se già loggato, redirect alla dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold mb-8">Login - NovelCraft AI (DEBUG)</h1>
      <LoginFormDebug />
    </main>
  );
}
