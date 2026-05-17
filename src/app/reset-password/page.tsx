"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        const data = await res.json();
        setError(data.error || "Link inválido ou expirado.");
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Este link de redefinição é inválido ou expirou.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm w-full max-w-sm space-y-2">
        <h1 className="text-xl font-bold">Senha redefinida!</h1>
        <p className="text-sm text-muted-foreground">
          Sua senha foi atualizada com sucesso. Redirecionando para o login…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm w-full max-w-sm">
      <h1 className="text-xl font-bold mb-2">Nova senha</h1>
      <p className="text-sm text-muted-foreground mb-6">Escolha uma nova senha para sua conta.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium mb-1">
            Confirmar senha
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvando…" : "Redefinir senha"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
