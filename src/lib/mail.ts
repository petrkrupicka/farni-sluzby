import { renderEmail, type EmailTemplate, type EmailTemplateId } from "./mail-templates";
import type { ParishState, Profile } from "./types";

export async function sendNotificationEmails(
  messages: { to: string; subject: string; html: string }[],
) {
  const valid = messages.filter((item) => item.to.includes("@") && item.subject.trim());
  if (valid.length === 0) return;
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: valid }),
    });
  } catch {
    /* odeslání nesmí blokovat práci v panelu */
  }
}

export function mailFromTemplate(
  state: ParishState,
  id: EmailTemplateId,
  recipients: Profile[],
  vars: Record<string, string>,
) {
  const template: EmailTemplate | undefined = state.emailTemplates[id];
  if (!template) return [];
  return recipients
    .filter((person) => person.email.includes("@"))
    .map((person) => {
      const rendered = renderEmail(template, {
        jmeno: person.fullName,
        email: person.email,
        ...vars,
      });
      return { to: person.email, ...rendered };
    });
}

export function sendTemplate(
  state: ParishState,
  id: EmailTemplateId,
  recipients: Profile[],
  vars: Record<string, string>,
) {
  return sendNotificationEmails(mailFromTemplate(state, id, recipients, vars));
}
