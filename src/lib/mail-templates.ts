export type EmailTemplateId =
  | "admin_removed_record"
  | "admin_removed_user"
  | "new_plan"
  | "new_substitute"
  | "new_swap";

export type EmailPlaceholder = {
  key: string;
  label: string;
};

export type EmailTemplate = {
  id: EmailTemplateId;
  name: string;
  description: string;
  subject: string;
  bodyHtml: string;
  placeholders: EmailPlaceholder[];
};

export type NotificationPrefs = {
  notifyNewPlan: boolean;
  notifyNewSubstitute: boolean;
  notifyNewSwap: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  notifyNewPlan: true,
  notifyNewSubstitute: true,
  notifyNewSwap: true,
};

const COMMON: EmailPlaceholder[] = [
  { key: "jmeno", label: "Jméno příjemce" },
  { key: "email", label: "E-mail příjemce" },
];

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "admin_removed_record",
    name: "Odstranění záznamu (záskok / výměna)",
    description: "Systémová zpráva po smazání záskoku nebo výměny hlavním správcem.",
    placeholders: [
      ...COMMON,
      { key: "typ_zaznamu", label: "Typ záznamu" },
      { key: "sluzba", label: "Služba" },
      { key: "termin", label: "Termín" },
      { key: "nazev", label: "Název termínu" },
      { key: "spravce", label: "Kdo odstranil" },
    ],
    subject: "Záznam byl odstraněn: {{typ_zaznamu}}",
    bodyHtml: `<p>Dobrý den, {{jmeno}},</p>
<p>hlavní správce <strong>{{spravce}}</strong> odstranil záznam typu <strong>{{typ_zaznamu}}</strong>.</p>
<p>Služba: {{sluzba}}<br />Termín: {{termin}}<br />{{nazev}}</p>
<p>Pokud s tím nesouhlasíte, ozvěte se ve farnosti.</p>`,
  },
  {
    id: "admin_removed_user",
    name: "Odstranění uživatele",
    description: "Systémová zpráva uživateli, jehož účet správce odstranil.",
    placeholders: [
      ...COMMON,
      { key: "spravce", label: "Kdo odstranil" },
    ],
    subject: "Váš účet ve Farních službách byl odstraněn",
    bodyHtml: `<p>Dobrý den, {{jmeno}},</p>
<p>hlavní správce <strong>{{spravce}}</strong> odstranil váš účet v aplikaci Farní služby.</p>
<p>Pokud jde o omyl, kontaktujte farnost.</p>`,
  },
  {
    id: "new_plan",
    name: "Nový plán služeb",
    description: "Uživatelské upozornění po sestavení plánu na období.",
    placeholders: [
      ...COMMON,
      { key: "sluzba", label: "Služba" },
      { key: "obdobi", label: "Období" },
    ],
    subject: "Nový plán služeb: {{sluzba}}",
    bodyHtml: `<p>Dobrý den, {{jmeno}},</p>
<p>byl zveřejněn nový plán služby <strong>{{sluzba}}</strong> na období <strong>{{obdobi}}</strong>.</p>
<p>Termíny najdete v kalendáři v aplikaci Farní služby.</p>`,
  },
  {
    id: "new_substitute",
    name: "Nová žádost o záskok",
    description: "Uživatelské upozornění členům služby, když někdo uvolní termín do burzy.",
    placeholders: [
      ...COMMON,
      { key: "sluzba", label: "Služba" },
      { key: "termin", label: "Termín" },
      { key: "nazev", label: "Název termínu" },
      { key: "zadatel", label: "Žadatel" },
    ],
    subject: "Nová žádost o záskok: {{sluzba}}",
    bodyHtml: `<p>Dobrý den, {{jmeno}},</p>
<p><strong>{{zadatel}}</strong> uvolnil termín do burzy záskoků.</p>
<p>Služba: {{sluzba}}<br />Termín: {{termin}}<br />{{nazev}}</p>
<p>Převzít ho můžete v Burze záskoků.</p>`,
  },
  {
    id: "new_swap",
    name: "Nová žádost o výměnu",
    description: "Uživatelské upozornění adresátovi výměny.",
    placeholders: [
      ...COMMON,
      { key: "sluzba", label: "Služba" },
      { key: "termin", label: "Váš termín" },
      { key: "nabidka", label: "Nabízený termín" },
      { key: "zadatel", label: "Žadatel" },
    ],
    subject: "Nová žádost o výměnu od {{zadatel}}",
    bodyHtml: `<p>Dobrý den, {{jmeno}},</p>
<p><strong>{{zadatel}}</strong> vás žádá o výměnu termínu ve službě <strong>{{sluzba}}</strong>.</p>
<p>Váš termín: {{termin}}<br />Nabízí: {{nabidka}}</p>
<p>Žádost schválíte nebo odmítnete v sekci Výměny.</p>`,
  },
];

export function defaultEmailTemplates(): Record<EmailTemplateId, EmailTemplate> {
  return Object.fromEntries(EMAIL_TEMPLATES.map((item) => [item.id, item])) as Record<
    EmailTemplateId,
    EmailTemplate
  >;
}

export function mergeEmailTemplates(
  stored?: Partial<Record<EmailTemplateId, Partial<EmailTemplate>>>,
): Record<EmailTemplateId, EmailTemplate> {
  const defaults = defaultEmailTemplates();
  if (!stored) return defaults;
  for (const template of EMAIL_TEMPLATES) {
    const extra = stored[template.id];
    if (!extra) continue;
    defaults[template.id] = {
      ...template,
      subject: extra.subject?.trim() || template.subject,
      bodyHtml: extra.bodyHtml?.trim() || template.bodyHtml,
    };
  }
  return defaults;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmail(
  template: EmailTemplate,
  vars: Record<string, string>,
): { subject: string; html: string } {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(vars[key] ?? ""));
  return {
    subject: fill(template.subject),
    html: `<div style="font-family:Georgia,serif;line-height:1.5;color:#1e2a24">${fill(template.bodyHtml)}</div>`,
  };
}
