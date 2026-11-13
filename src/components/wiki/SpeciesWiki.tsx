"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { shelves, speciesCount, speciesIcon, type Species } from "@/lib/species";

const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (s: Species, terms: string[]) => {
  const hay = `${s.name} ${s.scientific} ${s.id}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
};

type Selected = { species: Species; category: string; shelf: string };

export function SpeciesWiki() {
  const [query, setQuery] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(() => {
    const terms = words(query);
    return shelves
      .map((shelf) => ({
        ...shelf,
        categories: shelf.categories
          .map((category) => ({
            ...category,
            total: category.species.length,
            species: category.species.filter((s) => (!firstOnly || s.firstShipped) && matches(s, terms)),
          }))
          .filter((category) => category.species.length > 0),
      }))
      .filter((shelf) => shelf.categories.length > 0);
  }, [query, firstOnly]);

  const filtering = query.trim() !== "" || firstOnly;
  const shown = filtered.reduce((n, sh) => n + sh.categories.reduce((m, c) => m + c.species.length, 0), 0);

  const open = (sel: Selected) => {
    setSelected(sel);
    dialog.current?.showModal();
  };

  return (
    <div className="wiki">
      <div className="wiki-bar">
        <div className="wrap">
          <label className="wiki-search" htmlFor="wiki-q">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="wiki-q"
              type="search"
              placeholder="Search by name or botanical name"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="wiki-toggle" htmlFor="wiki-first">
            <input id="wiki-first" type="checkbox" checked={firstOnly} onChange={(e) => setFirstOnly(e.target.checked)} />
            <span>
              <span className="wiki-star">★</span> Originals only
            </span>
          </label>
          <span className="wiki-count pixel" aria-live="polite">
            {filtering ? `${shown} of ${speciesCount}` : `${speciesCount} species`}
          </span>
        </div>
      </div>

      <div className="wrap wiki-layout">
        <nav className="wiki-toc" aria-label="Categories">
          {shelves.map((shelf) => (
            <div key={shelf.id}>
              <a className="wiki-toc-shelf" href={`#${shelf.id}`}>
                {shelf.title}
              </a>
              <ul>
                {shelf.categories.map((category) => (
                  <li key={category.id}>
                    <a href={`#${category.id}`}>
                      {category.title}
                      <span>{category.species.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="wiki-main">
          <nav className="wiki-chips" aria-label="Shelves">
            {shelves.map((shelf) => (
              <a key={shelf.id} href={`#${shelf.id}`}>
                {shelf.title}
              </a>
            ))}
          </nav>

          {filtered.map((shelf) => (
            <section className="wiki-shelf" id={shelf.id} key={shelf.id}>
              <h2>{shelf.title}</h2>
              {shelf.categories.map((category) => (
                <div className="wiki-category" id={category.id} key={category.id}>
                  <h3>
                    <a href={`#${category.id}`}>{category.title}</a>
                    <span className="pixel">
                      {filtering ? `${category.species.length} of ${category.total}` : category.total}
                    </span>
                  </h3>
                  <div className="wiki-grid">
                    {category.species.map((s) => (
                      <button
                        type="button"
                        className="plant wiki-plant"
                        key={s.id}
                        onClick={() => open({ species: s, category: category.title, shelf: shelf.title })}
                      >
                        {s.firstShipped && (
                          <span className="wiki-star" title="One of the original plants">
                            ★
                          </span>
                        )}
                        {s.icon && <Image src={speciesIcon(s.id)} alt="" width={128} height={128} unoptimized />}
                        <strong>{s.name}</strong>
                        <em>{s.scientific}</em>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
          {shown === 0 && <p className="wiki-empty">No plants match that search.</p>}
        </div>
      </div>

      <dialog
        ref={dialog}
        className="wiki-dialog"
        aria-label={selected?.species.name}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        {selected && (
          <div>
            <button type="button" className="wiki-close" onClick={() => dialog.current?.close()} aria-label="Close">
              ×
            </button>
            <div className="wiki-dialog-art">
              {selected.species.icon && (
                <Image src={speciesIcon(selected.species.id)} alt="" width={128} height={128} unoptimized />
              )}
            </div>
            <h3>{selected.species.name}</h3>
            <p className="wiki-sci">{selected.species.scientific}</p>
            <dl>
              <dt>Shelf</dt>
              <dd>{selected.shelf}</dd>
              <dt>Category</dt>
              <dd>{selected.category}</dd>
              {selected.species.firstShipped && (
                <>
                  <dt>Original</dt>
                  <dd>
                    <span className="wiki-star">★</span> One of the first plants in Apila
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </dialog>
    </div>
  );
}
