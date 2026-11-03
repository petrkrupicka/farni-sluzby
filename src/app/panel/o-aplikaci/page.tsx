"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function AboutPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="O aplikaci"
        subtitle="Farní služby pomáhají naplánovat dobrovolnické služby a řešit, když někdo nemůže přijít."
      />

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">K čemu slouží</h2>
        <p>
          Aplikace umožňuje na jednom místě organizovat služby typu kostelník, lektor, varhaník, úklid,
          kavárna a podobné.
        </p>
        <p>
          Dobrovolník vidí své termíny v kalendáři. Absenci řeší výměnou s konkrétním člověkem, nebo
          uvolněním termínu do burzy záskoků.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">Jak začít</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            V{" "}
            <Link className="font-semibold text-forest underline" href="/panel/sluzby">
              Moje služby
            </Link>{" "}
            se přihlaste ke službě.
          </li>
          <li>
            U služeb pro jednotlivce (kostelník, lektor, varhaník) v podrobnostech zaškrtněte termíny,
            kdy můžete sloužit.
          </li>
          <li>
            U týmových služeb (úklid, kavárna) vás správce zařadí do čety — do plánu se dostanete až
            potom.
          </li>
          <li>
            Své termíny sledujte v{" "}
            <Link className="font-semibold text-forest underline" href="/panel/kalendar">
              Kalendáři
            </Link>
            .
          </li>
        </ol>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">Když nemůžete přijít</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link className="font-semibold text-forest underline" href="/panel/vymeny">
              Výměny
            </Link>{" "}
            — nabídnete svůj termín konkrétnímu člověku ze stejné služby. Bez časového limitu.
          </li>
          <li>
            <Link className="font-semibold text-forest underline" href="/panel/burza">
              Burza záskoků
            </Link>{" "}
            — termín se uvolní ostatním. U každé služby platí lhůta, jak dlouho předem to jde.
          </li>
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">Role</h2>
        <p>
          Každý uživatel má automaticky roli dobrovolníka, další role přidává hlavní správce. Jeden
          člověk jich může mít víc.
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Dobrovolník</strong> — přihlášení ke službě, kalendář, výměny a záskoky.
          </li>
          <li>
            <strong>Správce týmu</strong> — zařazuje lidi do čety a u týmové služby jedná za celek.
          </li>
          <li>
            <strong>Správce služby</strong> — rozvrh, plánování období a jednorázové události u své
            služby.
          </li>
          <li>
            <strong>Hlavní správce</strong> — zakládá služby, přiděluje správce a spravuje role.
          </li>
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-serif text-2xl">Verze</h2>
        <p>Verze 0.2</p>
      </section>
    </div>
  );
}
