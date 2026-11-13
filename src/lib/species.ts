// The species catalog from the Apila app, packed by scripts/pack-species.py.
import data from "./species.json";

export type Species = {
  id: string;
  name: string;
  scientific: string;
  /** The 3D shape the species is built from; "legacy" for the hand-built first species. */
  shape: string;
  /** One of the 123 species the app first shipped with. */
  firstShipped: boolean;
  icon: boolean;
};
export type Category = { id: string; title: string; species: Species[] };
export type Shelf = { id: string; title: string; categories: Category[] };

export const shelves: Shelf[] = data;
export const speciesCount = shelves.reduce(
  (n, shelf) => n + shelf.categories.reduce((m, category) => m + category.species.length, 0),
  0,
);
export const speciesIcon = (id: string) => `/assets/species/${id}.webp`;
