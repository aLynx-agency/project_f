"use client";
import React, { useState } from "react";

import { PaperPlaneTiltIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/auth-client";

type EmailForm = { email: string };

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const EmailAuthForm = ({ onSent }: { onSent: (email: string) => void }) => {
  const [form, setForm] = useState<EmailForm>({ email: "" });
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSocial = () => {
    setError(undefined);
    setLoading(true);

    signIn
      .social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/welcome",
        errorCallbackURL: "/signin?error=oauth",
      })
      .catch(() => {
        setError("Couldn't start Google sign-in.");
        setLoading(false);
      });
  };

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!form.email) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(undefined);
    setLoading(true);

    signIn
      .magicLink({
        email: form.email,
        callbackURL: "/dashboard",
        newUserCallbackURL: "/welcome",
        errorCallbackURL: "/error",
      })
      .then(() => onSent(form.email))
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={handleSocial}
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
      >
        <GoogleLogo />
        Continue with Google
      </Button>

      <Divider label="or" />

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <SpinnerGapIcon className="animate-spin" weight="bold" />
          ) : null}
          Continue with email
        </Button>

        {error && (
          <p role="alert" className="text-center text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </div>
  );
};

const SignIn = () => {
  const [sentTo, setSentTo] = useState<string>();

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary shadow-sm">
            <span className="text-base leading-none font-bold text-primary-foreground">
              A
            </span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Alynx
          </span>
        </div>

        <Card className="w-full gap-0 [--card-spacing:--spacing(6)]">
          {sentTo ? (
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <PaperPlaneTiltIcon className="size-6" weight="duotone" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-lg font-medium text-foreground">
                  Check your inbox
                </h1>
                <p className="text-sm text-muted-foreground">
                  We sent a link to{" "}
                  <span className="font-medium text-foreground">{sentTo}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSentTo(undefined)}
              >
                Use a different email
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Sign in to Alynx</CardTitle>
                <CardDescription>
                  Get started with Alynx in seconds.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <EmailAuthForm onSent={setSentTo} />
              </CardContent>
            </>
          )}
        </Card>

        <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default SignIn;
