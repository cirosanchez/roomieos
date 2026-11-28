"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { demoDestination, useDemoLogin } from "./demo-login-provider";

export function LoginScreen() {
  const { status, error, login } = useDemoLogin();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (status === "signed-in") router.replace(demoDestination());
  }, [status, router]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!login(String(data.get("email")), String(data.get("password"))))
      document.getElementById("login-email")?.focus();
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-subtle px-4 py-10">
      <Link href="/" aria-label="RoomieOS home" className="mb-8 rounded-lg">
        <Wordmark />
      </Link>
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl border border-line bg-page p-6 shadow-sm sm:p-8"
      >
        <p className="mb-2 text-xs font-medium tracking-widest text-accent uppercase">
          Local prototype
        </p>
        <h1 id="login-title" className="text-2xl font-semibold tracking-tight">
          Welcome to your shared home
        </h1>
        <p className="mt-3 text-sm text-muted">
          Use the demo login to continue. This is a simulation, with no real
          accounts. Your household stays in this browser.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <FormField
            id="login-email"
            name="email"
            label="Email"
            type="email"
            autoComplete="off"
            required
            aria-describedby={error ? "login-error" : undefined}
          />
          <div className="relative">
            <FormField
              id="login-password"
              name="password"
              label="Password"
              type={visible ? "text" : "password"}
              autoComplete="off"
              required
              className="pr-12"
              aria-describedby={error ? "login-error" : undefined}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
              className="absolute right-0 bottom-0"
            >
              {visible ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </Button>
          </div>
          {error && (
            <p id="login-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={status === "loading" || status === "signed-in"}
            className="w-full"
          >
            Log in
          </Button>
        </form>
      </section>
      <Link
        href="/"
        className="mt-6 rounded text-sm text-muted underline underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
