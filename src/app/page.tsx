import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Handshake,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <p className="font-serif text-2xl">Farní služby</p>
        <div className="flex gap-2">
          <Link href="/prihlaseni" className="btn btn-ghost">
            Přihlásit se
          </Link>
          <Link href="/registrace" className="btn btn-primary">
            Registrovat se
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="card mt-6 overflow-hidden p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Dobrovolnictví ve farnosti
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">
            Přehledný plán služeb, výměn a záskoků — i z mobilu.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Kostelník, lektor, varhaník, úklid i kavárna na jednom místě. Správci
            sestaví rozvrh, dobrovolníci vidí svůj kalendář a absenci řeší
            adresnou výměnou nebo veřejnou burzou záskoků.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/prihlaseni" className="btn btn-primary min-h-12">
              Přihlásit se
            </Link>
            <Link href="/registrace" className="btn btn-ghost min-h-12">
              Registrovat se
            </Link>
            <a href="#role" className="btn btn-ghost min-h-12">
              Prohlédnout role
            </a>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              title: "Kalendář služeb",
              text: "Jasné štítky: moje služba, čekající výměna a volný záskok.",
            },
            {
              icon: Handshake,
              title: "Adresné výměny",
              text: "Prohodíte si termín s konkrétním člověkem. Bez časového limitu.",
            },
            {
              icon: Store,
              title: "Burza záskoků",
              text: "Když nestihnete přijít, termín se uvolní ostatním ze služby.",
            },
          ].map((item) => (
            <article key={item.title} className="card p-5">
              <item.icon className="text-forest" />
              <h2 className="mt-3 font-serif text-xl">{item.title}</h2>
              <p className="mt-1 text-muted">{item.text}</p>
            </article>
          ))}
        </section>

        <section id="role" className="mt-10">
          <h2 className="font-serif text-3xl">Čtyři role, jasná práva</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Hlavní správce",
                text: "Zakládá služby, rozvrhy a funkce výměn i záskoků. Přiřazuje správce služeb a týmů.",
              },
              {
                icon: ClipboardList,
                title: "Správce služby",
                text: "Spravuje konkrétní službu, plánuje období a může okamžitě přepsat kohokoliv v plánu.",
              },
              {
                icon: Users,
                title: "Správce týmu",
                text: "Zařazuje dobrovolníky do své čety a při výměnách i záskocích jedná za celý tým.",
              },
              {
                icon: CalendarDays,
                title: "Dobrovolník",
                text: "Přihlásí se ke službě, nastaví preference a sleduje svůj kalendář.",
              },
            ].map((item) => (
              <article key={item.title} className="card flex gap-4 p-5">
                <item.icon className="mt-1 shrink-0 text-gold" />
                <div>
                  <h3 className="font-serif text-xl">{item.title}</h3>
                  <p className="text-muted">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
