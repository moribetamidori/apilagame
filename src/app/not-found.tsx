import Link from "next/link";
import { DocHero } from "@/components/DocHero";

export default function NotFound() {
  return (
    <>
      <DocHero title="This patch is still bare.">
        <p>We couldn&apos;t find that page. Nothing has been planted here yet.</p>
      </DocHero>
      <article className="doc">
        <div className="wrap">
          <Link className="btn btn-ghost" href="/">
            Back to the garden
          </Link>
        </div>
      </article>
    </>
  );
}
