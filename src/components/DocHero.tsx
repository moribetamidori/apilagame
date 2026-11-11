import type { ReactNode } from "react";

export function DocHero({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="doc-hero">
      <div className="wrap">
        <span className="kicker pixel">Apila: Flower Friends</span>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}
