interface PlanTask {
  topicTitle: string;
  goalTitle: string;
  taskType: "new_learning" | "review";
  suggestedMinutes: number;
}

interface DailyDigestData {
  displayName: string;
  planDate: string;
  availableMinutes: number;
  tasks: PlanTask[];
  appUrl: string;
}

export function buildDailyDigestEmail(data: DailyDigestData): { subject: string; html: string } {
  const { displayName, planDate, availableMinutes, tasks, appUrl } = data;

  const dateLabel = new Date(planDate + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const taskRows = tasks
    .map((t) => {
      const badge =
        t.taskType === "review"
          ? `<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:11px;">Revisão</span>`
          : `<span style="background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 6px;font-size:11px;">Novo</span>`;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${badge}
              <strong style="font-size:14px;">${t.topicTitle}</strong>
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:3px;">${t.goalTitle} · ${t.suggestedMinutes} min</div>
          </td>
        </tr>`;
    })
    .join("");

  const noTasksMsg =
    tasks.length === 0
      ? `<p style="color:#64748b;font-size:14px;">Nenhuma tarefa para hoje. Crie um goal para começar!</p>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

    <div style="background:#0f172a;padding:24px 28px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">StudyGuide AI</p>
      <h1 style="color:#fff;font-size:20px;margin:0;">Seu plano de hoje</h1>
      <p style="color:#cbd5e1;font-size:13px;margin:6px 0 0;">${dateLabel} · ${availableMinutes} min disponíveis</p>
    </div>

    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#334155;margin:0 0 16px;">Olá, <strong>${displayName}</strong>! Aqui está o que está planejado para hoje:</p>

      ${noTasksMsg}
      ${tasks.length > 0 ? `<table style="width:100%;border-collapse:collapse;">${taskRows}</table>` : ""}

      <div style="margin-top:24px;text-align:center;">
        <a href="${appUrl}/dashboard"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Abrir Dashboard →
        </a>
      </div>
    </div>

    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">StudyGuide AI · Você recebe este e-mail porque tem notificações ativas.</p>
    </div>
  </div>
</body>
</html>`;

  const taskCount = tasks.length;
  const subject =
    taskCount === 0
      ? `[StudyGuide] Sem tarefas para hoje`
      : `[StudyGuide] ${taskCount} tarefa${taskCount !== 1 ? "s" : ""} para hoje — ${availableMinutes} min`;

  return { subject, html };
}

export function buildPasswordResetEmail(resetLink: string): { subject: string; html: string } {
  const subject = "[StudyGuide] Redefinição de senha";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

    <div style="background:#0f172a;padding:24px 28px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">StudyGuide AI</p>
      <h1 style="color:#fff;font-size:20px;margin:0;">Redefinição de senha</h1>
    </div>

    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#334155;margin:0 0 16px;">
        Recebemos uma solicitação para redefinir a senha da sua conta.
        Clique no botão abaixo para escolher uma nova senha.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 24px;">
        Este link é válido por <strong>1 hora</strong> e pode ser usado apenas uma vez.
        Se você não solicitou a redefinição, ignore este e-mail.
      </p>

      <div style="text-align:center;">
        <a href="${resetLink}"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Redefinir senha →
        </a>
      </div>
    </div>

    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">StudyGuide AI · Se o botão não funcionar, copie e cole este link: ${resetLink}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
