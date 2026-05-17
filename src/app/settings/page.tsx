"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Download, Trash2, AlertTriangle, Bell, BellOff } from "lucide-react";

export default function SettingsPage() {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    fetch("/api/account/settings/me")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.emailNotificationsEnabled === "boolean") {
          setEmailEnabled(data.emailNotificationsEnabled);
        }
      })
      .catch(() => {});
  }, []);

  async function toggleEmailNotifications() {
    if (emailEnabled === null) return;
    const next = !emailEnabled;
    setSavingEmail(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotificationsEnabled: next }),
      });
      if (res.ok) setEmailEnabled(next);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch("/api/account/delete", { method: "DELETE" });
      await signOut({ callbackUrl: "/login" });
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seus dados e conta</p>
      </div>

      {/* Email Notifications */}
      <section className="border rounded-lg p-6 space-y-3">
        <h2 className="font-semibold text-lg">Notificações por e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Receba um resumo diário com as tarefas do dia no seu e-mail.
        </p>
        {emailEnabled !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {emailEnabled ? (
                <>
                  <Bell className="h-4 w-4 text-green-600" />
                  <span>E-mails diários ativados</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">E-mails diários desativados</span>
                </>
              )}
            </div>
            <button
              onClick={toggleEmailNotifications}
              disabled={savingEmail}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                emailEnabled
                  ? "border hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {savingEmail ? "Salvando…" : emailEnabled ? "Desativar" : "Ativar"}
            </button>
          </div>
        )}
      </section>

      {/* Export */}
      <section className="border rounded-lg p-6 space-y-3">
        <h2 className="font-semibold text-lg">Exportar meus dados</h2>
        <p className="text-sm text-muted-foreground">
          Baixe todos os seus dados de aprendizado (metas, trilhas, tópicos, sessões e planos diários) em formato JSON.
        </p>
        <a
          href="/api/account/export"
          download
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar exportação
        </a>
      </section>

      {/* Delete */}
      <section className="border border-destructive/30 rounded-lg p-6 space-y-3">
        <h2 className="font-semibold text-lg text-destructive">Excluir conta</h2>
        <p className="text-sm text-muted-foreground">
          Esta ação é permanente e irreversível. Todos os seus dados serão apagados imediatamente.
        </p>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Excluir minha conta
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Tem certeza? Essa ação não pode ser desfeita. Todos os seus dados serão excluídos permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Excluindo…" : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
