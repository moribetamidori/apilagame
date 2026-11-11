import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <Link className="brand" href="/">
          <Image src="/assets/icon.png" alt="" width={34} height={34} />
          {site.name}
        </Link>
        <nav aria-label="Footer">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/support">Support</Link>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </nav>
        <small>
          © 2026 {site.owner}. Apple, the Apple logo and iPhone are trademarks of Apple Inc.
        </small>
      </div>
    </footer>
  );
}
