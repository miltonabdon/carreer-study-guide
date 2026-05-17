"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError("Ocorreu um erro. Tente novamente.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="rounded-lg border bg-card p-8 shadow-sm w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">E-mail enviado</h1>
          <p className="text-sm text-muted-foreground">
            Se o endereço estiver cadastrado, você receberá um link de redefinição em breve.
            Verifique também a caixa de spam.
          </p>
          <Link
            href="/login"
            className="block w-full text-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="rounded-lg border bg-card p-8 shadow-sm w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Enviando…" : "Enviar link de redefinição"}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Voltar ao login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
