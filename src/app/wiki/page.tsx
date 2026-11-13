import type { Metadata } from "next";
import { SpeciesWiki } from "@/components/wiki/SpeciesWiki";
import { shelves, speciesCount } from "@/lib/species";

export const metadata: Metadata = {
  title: "Plant Wiki",
  description: `Every plant, fungus and lichen in Apila: Flower Friends — all ${speciesCount.toLocaleString("en-US")} species, sorted by shelf and category, with their botanical names.`,
  alternates: { canonical: "/wiki" },
};

export default function WikiPage() {
  const categoryCount = shelves.reduce((n, shelf) => n + shelf.categories.length, 0);
  return (
    <>
      <div className="doc-hero wiki-hero">
        <div className="wrap">
          <span className="kicker pixel">Apila: Flower Friends</span>
          <h1>Plant Wiki</h1>
          <p>
            All {speciesCount.toLocaleString("en-US")} plants, fungi and lichens you can collect, sorted the way the
            Collect tab sorts them: {shelves.length} shelves and {categoryCount} categories.
          </p>
        </div>
      </div>
      <SpeciesWiki />
    </>
  );
}
