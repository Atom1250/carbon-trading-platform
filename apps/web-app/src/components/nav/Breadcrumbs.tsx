import Link from "next/link";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm text-muted-foreground">
      {items.map((it, idx) => (
        <span key={idx} className="flex items-center gap-2">
          {it.href ? (
            <Link className="hover:underline" href={it.href}>
              {it.label}
            </Link>
          ) : (
            <span>{it.label}</span>
          )}
          {idx < items.length - 1 && <span>/</span>}
        </span>
      ))}
    </nav>
  );
}
