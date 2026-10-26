export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-5">
      <h1 className="font-serif text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
    </header>
  );
}
