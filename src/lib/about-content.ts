export type AboutChangelogEntry = {
  version: string;
  items: string[];
};

export type AboutSection = {
  id: string;
  title: string;
  html: string;
};

export type AboutPageContent = {
  subtitle: string;
  sections: AboutSection[];
  versionLabel: string;
  changelog: AboutChangelogEntry[];
};

const DEFAULT_CHANGELOG: AboutChangelogEntry[] = [
  {
    version: "0.3",
    items: [
      "Profil: sekce Upozornění (nový plán, záskok, výměna)",
      "Nastavení / Upozornění: úprava e-mailových šablon",
      "Hlavní správce může odstranit záskok, výměnu i uživatele",
      "Stránka O aplikaci editovatelná po sekcích, včetně changelogu",
      "Google kalendář a odesílání e-mailů odloženy na další verzi",
    ],
  },
  {
    version: "0.2",
    items: [
      "Stránka Profil (jméno, adresa, telefon)",
      "Stránka O aplikaci",
      "Více rolí u jednoho člověka",
      "Navigace zvlášť pro dobrovolníka a správce",
      "Preference v podrobnostech služby",
      "Nelze odebrat správce, dokud má přiřazenou službu nebo tým",
      "Ukázkové účty jen při místním vývoji",
    ],
  },
  {
    version: "0.1",
    items: [
      "Přihlášení a registrace e-mailem",
      "Kalendář a přehled služeb",
      "Plánování období a jednorázových událostí",
      "Týmy, výměny a burza záskoků",
      "Role dobrovolník, správce týmu, správce služby, hlavní správce",
    ],
  },
];

export function defaultAboutPage(): AboutPageContent {
  return {
    subtitle:
      "Farní služby pomáhají naplánovat dobrovolnické služby a řešit, když někdo nemůže přijít.",
    versionLabel: "Verze 0.3",
    changelog: DEFAULT_CHANGELOG.map((entry) => ({
      ...entry,
      items: [...entry.items],
    })),
    sections: [
      {
        id: "purpose",
        title: "K čemu slouží",
        html: `<p>Aplikace umožňuje na jednom místě organizovat služby typu kostelník, lektor, varhaník, úklid, kavárna a podobné.</p>
<p>Dobrovolník vidí své termíny v kalendáři. Absenci řeší výměnou s konkrétním člověkem, nebo uvolněním termínu do burzy záskoků.</p>`,
      },
      {
        id: "start",
        title: "Jak začít",
        html: `<ol>
<li>V <a href="/panel/sluzby">Moje služby</a> se přihlaste ke službě.</li>
<li>U služeb pro jednotlivce (kostelník, lektor, varhaník) v podrobnostech zaškrtněte termíny, kdy můžete sloužit.</li>
<li>U týmových služeb (úklid, kavárna) vás správce zařadí do čety — do plánu se dostanete až potom.</li>
<li>Své termíny sledujte v <a href="/panel/kalendar">Kalendáři</a>.</li>
</ol>`,
      },
      {
        id: "absence",
        title: "Když nemůžete přijít",
        html: `<ul>
<li><a href="/panel/vymeny">Výměny</a> — nabídnete svůj termín konkrétnímu člověku ze stejné služby. Bez časového limitu.</li>
<li><a href="/panel/burza">Burza záskoků</a> — termín se uvolní ostatním. U každé služby platí lhůta, jak dlouho předem to jde.</li>
</ul>`,
      },
      {
        id: "roles",
        title: "Role",
        html: `<p>Každý uživatel má automaticky roli dobrovolníka, další role přidává hlavní správce. Jeden člověk jich může mít víc.</p>
<ul>
<li><strong>Dobrovolník</strong> — přihlášení ke službě, kalendář, výměny a záskoky.</li>
<li><strong>Správce týmu</strong> — zařazuje lidi do čety a u týmové služby jedná za celek.</li>
<li><strong>Správce služby</strong> — rozvrh, plánování období a jednorázové události u své služby.</li>
<li><strong>Hlavní správce</strong> — zakládá služby, přiděluje správce a spravuje role.</li>
</ul>`,
      },
    ],
  };
}

export function mergeAboutPage(stored?: Partial<AboutPageContent> | null): AboutPageContent {
  const defaults = defaultAboutPage();
  if (!stored) return defaults;
  const storedChangelog = Array.isArray(stored.changelog) ? stored.changelog : [];
  const changelog = [...storedChangelog];
  for (const entry of defaults.changelog) {
    if (!changelog.some((item) => item.version === entry.version)) {
      changelog.push(entry);
    }
  }
  changelog.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  const storedSections = Array.isArray(stored.sections) ? stored.sections : [];
  const sections =
    storedSections.length > 0
      ? storedSections.map((section) => ({
          id: section.id,
          title: section.title?.trim() || "Sekce",
          html: section.html ?? "",
        }))
      : defaults.sections;
  const storedLabel = stored.versionLabel?.trim() || "";
  const versionLabel =
    storedLabel && !/^Verze 0\.[12]$/.test(storedLabel) ? storedLabel : defaults.versionLabel;
  return {
    subtitle: stored.subtitle?.trim() || defaults.subtitle,
    versionLabel,
    sections,
    changelog: changelog.map((entry) => ({
      version: entry.version,
      items: (entry.items ?? []).map((item) => item.trim()).filter(Boolean),
    })),
  };
}
