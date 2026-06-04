"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-ft-bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight ft-num"
            style={{ color: "var(--color-ft-primary)" }}
          >
            FinTrack
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ft-text-2)" }}>
            {t("subtitle")}
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--color-ft-surface)",
            borderColor: "var(--color-ft-border)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "var(--color-ft-text)" }}>
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  backgroundColor: "var(--color-ft-surface-2)",
                  borderColor: "var(--color-ft-border)",
                  color: "var(--color-ft-text)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: "var(--color-ft-text)" }}>
                {t("password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  backgroundColor: "var(--color-ft-surface-2)",
                  borderColor: "var(--color-ft-border)",
                  color: "var(--color-ft-text)",
                }}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
