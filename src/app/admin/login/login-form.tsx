"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          placeholder="owner@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Lock aria-hidden="true" />
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-xs leading-relaxed text-muted">
        This dashboard is for the store owner only. There is no public registration. Access is rate
        limited and every session is recorded.
      </p>
    </form>
  );
}
