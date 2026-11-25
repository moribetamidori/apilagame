import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactCard } from "@/components/ContactCard";
import { DocHero } from "@/components/DocHero";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Apila: Flower Friends. Contact us, delete your account, or report and block someone.",
  alternates: { canonical: "/support" },
};

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "How do I sign in?",
    a: (
      <p>
        Apila uses Sign in with Apple or Google. If you choose Apple&apos;s &quot;Hide My Email&quot;, we only see the
        relay address Apple gives us.
      </p>
    ),
  },
  {
    q: "How do I add a friend?",
    a: (
      <p>
        Open <strong>Friends</strong> and invite someone by their username. Once they accept, you can visit each
        other&apos;s planets, make plans and grow trees together.
      </p>
    ),
  },
  {
    q: "How do I report, block or remove someone?",
    a: (
      <>
        <p>
          Long press a friend in the Friends list, or tap <strong>⋯</strong> on their card on your planet, then choose
          Report, Block or Remove. You can unblock people later in <strong>Settings</strong>.
        </p>
        <p>We review every report. If someone is making you feel unsafe, you can also email us directly.</p>
      </>
    ),
  },
  {
    q: "How do I delete my account?",
    a: (
      <p>
        Go to <strong>Friends → ⚙︎ Settings → Delete account</strong>. This permanently deletes your account, planet,
        journal, album, photos, letters, Friend Cards, step claims, trees and friendships. It can&apos;t be undone. Trees your friends planted stay with them.
      </p>
    ),
  },
  {
    q: "Does Apila track my location or health data?",
    a: (
      <p>
        Apila never collects or tracks your location. If you connect Apple Health, Apila reads your daily step count,
        and only the daily step totals you claim are sent to us, to award four-leaf clovers and stop the same day being
        claimed twice. We never sell or share Health data, or use it for ads. See the{" "}
        <Link href="/privacy">privacy policy</Link> for details.
      </p>
    ),
  },
  {
    q: "Is my voice recorded in duet games?",
    a: (
      <p>
        No. Your voice is sent live to the friend you&apos;re playing with so it can move your shovel. It&apos;s never
        recorded or stored.
      </p>
    ),
  },
  {
    q: "Why aren't my steps showing?",
    a: (
      <p>
        Apila needs permission to read your step count. Open the iPhone <strong>Settings</strong> app →{" "}
        <strong>Health</strong> → <strong>Data Access &amp; Devices</strong> → <strong>Apila</strong>, and turn on Steps.
      </p>
    ),
  },
];

export default function SupportPage() {
  return (
    <>
      <DocHero title="Support">
        <p>Something not blooming the way it should? We&apos;re happy to help.</p>
      </DocHero>

      <article className="doc">
        <div className="wrap">
          <ContactCard title="Email us" subject="Apila support">
            <span className="contact-hint">
              Include your Apila username and your iPhone model if something&apos;s broken.
            </span>
          </ContactCard>

          <h2>Common questions</h2>
          {faqs.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              {a}
            </details>
          ))}

          <h2>Privacy</h2>
          <p>
            Read what Apila collects and what you can do about it in our <Link href="/privacy">privacy policy</Link>.
          </p>
        </div>
      </article>
    </>
  );
}
