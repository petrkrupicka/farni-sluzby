"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/mail-templates";
import { isMainAdmin } from "@/lib/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParish } from "@/lib/store";

export default function NotificationSettingsPage() {
  const { state, currentUser, dispatch } = useParish();
  const [selectedId, setSelectedId] = useState<EmailTemplateId>("new_plan");
  const [saved, setSaved] = useState(false);
  const template = state.emailTemplates[selectedId];
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const meta = useMemo(
    () => EMAIL_TEMPLATES.find((item) => item.id === selectedId) ?? EMAIL_TEMPLATES[0],
    [selectedId],
  );

  if (!isMainAdmin(currentUser)) {
    return <p className="card p-5">Šablony upozornění spravuje jen hlavní správce.</p>;
  }

  const select = (id: EmailTemplateId) => {
    const next = state.emailTemplates[id];
    setSelectedId(id);
    setSubject(next.subject);
    setBodyHtml(next.bodyHtml);
    setSaved(false);
  };

  return (
    <div>
      <PageHeader
        title="Upozornění"
        subtitle="Upravte e-mailové šablony. Placeholdery v dvojitých složených závorkách se při odeslání nahradí údaji o události."
      />
      <p className="mb-4 text-sm text-muted">
        Odesílání z produkce vyžaduje v hostingu <code>RESEND_API_KEY</code> a volitelně{" "}
        <code>RESEND_FROM</code>. Bez klíče se šablony uloží, e-maily se ale neodešlou.
      </p>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <nav className="card space-y-1 p-2">
          {EMAIL_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                item.id === selectedId ? "bg-forest text-white" : "hover:bg-[#f3eee2]"
              }`}
              onClick={() => select(item.id)}
            >
              {item.name}
            </button>
          ))}
        </nav>
        <form
          className="card space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            dispatch({
              type: "UPDATE_EMAIL_TEMPLATE",
              id: selectedId,
              patch: { subject: subject.trim(), bodyHtml },
            });
            const client = getSupabaseBrowserClient();
            if (client) {
              await client.from("email_templates").upsert({
                id: selectedId,
                subject: subject.trim(),
                body_html: bodyHtml,
              });
            }
            setSaved(true);
          }}
        >
          <p className="text-sm text-muted">{meta.description}</p>
          <label className="block text-sm font-semibold">
            Předmět
            <input
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-semibold">Tělo e-mailu</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {meta.placeholders.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="btn btn-ghost min-h-9 px-3 text-xs"
                  onClick={() => setBodyHtml((html) => `${html} {{${item.key}}}`)}
                  title={item.label}
                >
                  {`{{${item.key}}}`}
                </button>
              ))}
            </div>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>
          {saved ? <p className="text-sm text-forest">Šablona je uložená.</p> : null}
          <button className="btn btn-primary" type="submit">
            Uložit šablonu
          </button>
        </form>
      </div>
    </div>
  );
}
