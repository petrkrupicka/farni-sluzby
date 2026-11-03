"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { mergeAboutPage, type AboutChangelogEntry, type AboutPageContent } from "@/lib/about-content";
import { isMainAdmin } from "@/lib/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParish } from "@/lib/store";

export default function AboutPage() {
  const { state, currentUser, dispatch } = useParish();
  const admin = isMainAdmin(currentUser);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AboutPageContent>(state.aboutPage);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(state.aboutPage);
  }, [state.aboutPage, editing]);

  const page = editing ? draft : state.aboutPage;

  const save = async () => {
    const next = mergeAboutPage(draft);
    dispatch({ type: "SET_ABOUT_PAGE", page: next });
    const client = getSupabaseBrowserClient();
    if (client) {
      await client.from("about_page").upsert({ id: "about", payload: next, updated_at: new Date().toISOString() });
    }
    setDraft(next);
    setEditing(false);
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="O aplikaci" subtitle={page.subtitle} />
      {admin ? (
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button className="btn btn-primary" type="button" onClick={() => void save()}>
                Uložit změny
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setDraft(state.aboutPage);
                  setEditing(false);
                }}
              >
                Zrušit
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setSaved(false);
                setDraft(state.aboutPage);
                setEditing(true);
              }}
            >
              Upravit stránku
            </button>
          )}
          {saved && !editing ? <p className="self-center text-sm text-forest">Změny jsou uložené.</p> : null}
        </div>
      ) : null}

      {editing ? (
        <label className="card block space-y-1 p-5 text-sm font-semibold">
          Úvod pod nadpisem
          <input
            className="mt-1 w-full rounded-xl border border-line p-3 font-normal"
            value={draft.subtitle}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
          />
        </label>
      ) : null}

      {page.sections.map((section, index) => (
        <section key={section.id} className="card space-y-3 p-5">
          {editing ? (
            <>
              <label className="block text-sm font-semibold">
                Název sekce
                <input
                  className="mt-1 w-full rounded-xl border border-line p-3 font-serif text-2xl font-normal"
                  value={section.title}
                  onChange={(e) => {
                    const sections = draft.sections.map((item, i) =>
                      i === index ? { ...item, title: e.target.value } : item,
                    );
                    setDraft({ ...draft, sections });
                  }}
                />
              </label>
              <RichTextEditor
                value={section.html}
                onChange={(html) => {
                  const sections = draft.sections.map((item, i) => (i === index ? { ...item, html } : item));
                  setDraft({ ...draft, sections });
                }}
              />
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl">{section.title}</h2>
              <div className="about-body space-y-3" dangerouslySetInnerHTML={{ __html: section.html }} />
            </>
          )}
        </section>
      ))}

      <section className="card space-y-3 p-5">
        {editing ? (
          <label className="block text-sm font-semibold">
            Verze
            <input
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={draft.versionLabel}
              onChange={(e) => setDraft({ ...draft, versionLabel: e.target.value })}
            />
          </label>
        ) : (
          <>
            <h2 className="font-serif text-2xl">Verze</h2>
            <p>{page.versionLabel}</p>
          </>
        )}

        <details className="rounded-xl border border-line bg-[#fbf8f1] p-4" open={editing || undefined}>
          <summary className="cursor-pointer font-serif text-xl">Changelog</summary>
          <div className="mt-4 space-y-5">
            {(editing ? draft.changelog : page.changelog).map((entry, entryIndex) => (
              <div key={`${entry.version}-${entryIndex}`}>
                {editing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="w-28 rounded-xl border border-line p-2"
                        value={entry.version}
                        onChange={(e) => updateChangelog(draft, setDraft, entryIndex, { version: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost min-h-10"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            changelog: draft.changelog.filter((_, i) => i !== entryIndex),
                          })
                        }
                      >
                        Odebrat verzi
                      </button>
                    </div>
                    {entry.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-xl border border-line p-2"
                          value={item}
                          onChange={(e) =>
                            updateChangelogItem(draft, setDraft, entryIndex, itemIndex, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-ghost min-h-10 px-3"
                          onClick={() => removeChangelogItem(draft, setDraft, entryIndex, itemIndex)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => addChangelogItem(draft, setDraft, entryIndex)}
                    >
                      Přidat odrážku
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold">{entry.version}</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {entry.items.map((item, itemIndex) => (
                        <li key={`${entry.version}-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
            {editing ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    changelog: [{ version: "", items: [""] }, ...draft.changelog],
                  })
                }
              >
                Přidat verzi
              </button>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  );
}

function updateChangelog(
  draft: AboutPageContent,
  setDraft: (page: AboutPageContent) => void,
  index: number,
  patch: Partial<AboutChangelogEntry>,
) {
  setDraft({
    ...draft,
    changelog: draft.changelog.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
  });
}

function updateChangelogItem(
  draft: AboutPageContent,
  setDraft: (page: AboutPageContent) => void,
  entryIndex: number,
  itemIndex: number,
  value: string,
) {
  setDraft({
    ...draft,
    changelog: draft.changelog.map((entry, i) =>
      i === entryIndex
        ? { ...entry, items: entry.items.map((item, j) => (j === itemIndex ? value : item)) }
        : entry,
    ),
  });
}

function addChangelogItem(
  draft: AboutPageContent,
  setDraft: (page: AboutPageContent) => void,
  entryIndex: number,
) {
  setDraft({
    ...draft,
    changelog: draft.changelog.map((entry, i) =>
      i === entryIndex ? { ...entry, items: [...entry.items, ""] } : entry,
    ),
  });
}

function removeChangelogItem(
  draft: AboutPageContent,
  setDraft: (page: AboutPageContent) => void,
  entryIndex: number,
  itemIndex: number,
) {
  setDraft({
    ...draft,
    changelog: draft.changelog.map((entry, i) =>
      i === entryIndex ? { ...entry, items: entry.items.filter((_, j) => j !== itemIndex) } : entry,
    ),
  });
}
