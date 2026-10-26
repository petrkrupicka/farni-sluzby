# Farní služby

Webová aplikace pro správu dobrovolnických služeb ve farnosti (Next.js App Router, Tailwind CSS, Lucide, Supabase Auth).

Přihlášení je přes Supabase. Provozní data plánu zůstávají v prohlížeči, dokud je plně nepřevedete do databáze. Build je statický (`○`), takže provoz na Vercel Hobby zůstává lehký.

## Spuštění

```bash
npm install
cp .env.example .env.local
npm run dev
```

Do `.env.local` doplňte URL a anon klíč projektu Supabase. Otevřete [http://localhost:3000](http://localhost:3000), zaregistrujte se e-mailem a heslem. Výchozí role je **Dobrovolník**.

## Supabase

1. Vytvořte projekt v [Supabase](https://supabase.com).
2. Do SQL Editoru vložte `supabase/schema.sql`.
3. V Authentication zapněte e-mailové přihlášení. Pro pilot můžete vypnout potvrzení e-mailu.
4. Prvnímu faráři nastavte roli hlavního správce:
   - v `.env.local` `NEXT_PUBLIC_ADMIN_EMAIL=farář@farnost.cz`, nebo
   - `update public.profiles set role = 'hlavni_spravce' where email = '...';`
5. Další role mění hlavní správce v **Nastavení → Uživatelé a role**.

## Role

- **Hlavní správce** — služby, rozvrhy, funkce výměn/záskoků, přiřazení správců a rolí.
- **Správce služby** — plán, nastavení služby, okamžité přepsání přiřazení.
- **Správce týmu** — zařazení dobrovolníků do čety, výměny a záskoky za celý tým.
- **Dobrovolník** — výchozí role po registraci. Přihlášení ke službě, preference, vlastní kalendář.

## Plánování

1. Opakující se posloupnost (pevné střídání).
2. Náhodný výběr s férovostí (preference + nejméně služeb v období).
