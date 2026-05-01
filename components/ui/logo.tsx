import Link from "next/link";

export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md" | "lg"; href?: string | null }) {
  const fontSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const dotSize = size === "lg" ? "w-2.5 h-2.5" : size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  const inner = (
    <span className="inline-flex items-center gap-2 select-none">
      <span className={`${dotSize} rounded-full bg-accent`} aria-hidden />
      <span className={`font-display ${fontSize} tracking-tight text-ink`}>snailon</span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  );
}
