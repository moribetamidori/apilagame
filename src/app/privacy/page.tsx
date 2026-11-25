import type { Metadata } from "next";
import { ContactCard } from "@/components/ContactCard";
import { DocHero } from "@/components/DocHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Apila: Flower Friends collects, why, and what you can do about it.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "November 25, 2026";

const Email = () => <a href={`mailto:${site.email}`}>{site.email}</a>;

export default function PrivacyPage() {
  return (
    <>
      <DocHero title="Privacy Policy">
        <p>
          <em>Last updated: {LAST_UPDATED}</em>
        </p>
      </DocHero>

      <article className="doc">
        <div className="wrap">
          <p>
            Apila is a garden you grow with the people you love. This policy explains what Apila collects, why, and what
            you can do about it. Apila is made by {site.owner} (&quot;we&quot;). Questions: <Email />.
          </p>

          <h2>What we collect</h2>
          <p>
            <strong>Your account.</strong> When you sign in with Apple or Google, we receive your email address and, if
            you share it, your name. Your account also has a username, display name, and optional birthday you choose.
            If you use Apple&apos;s &quot;Hide My Email&quot;, we only see the relay address Apple gives us.
          </p>
          <p>
            <strong>What you make in Apila.</strong> Your planet (its land, paint, plants, backdrops, decorations, and
            gifts), your plans, your journal entries and journal photos, photos you take of your Apila character in the
            album, trees you grow with friends and notes you leave on them, letters and postcards (including photos you
            attach to them), and a rendered picture of your Apila character so friends can see it. Note that unread
            postcards and postcards pinned to a planet&apos;s postcard board are visible to the recipient&apos;s friends
            when visiting that planet.
          </p>
          <p>
            <strong>Your friends &amp; Friend Cards.</strong> Who you&apos;ve invited, who you&apos;re friends with, who
            you&apos;ve blocked, and optional private Friend Cards you create for people in your life (which may include
            their name, birthday, phone number, Instagram handle, and personal notes, visible only to you). Friends can
            see your display name, username, character, planet, focus/level progress, and recent planet visits or
            presence.
          </p>
          <p>
            <strong>Steps and Apple Health data.</strong> If you choose to connect Apple Health, Apila reads your daily
            step counts and sends the daily step totals you claim to our server (Supabase) strictly to award in-app
            four-leaf clovers and prevent claiming the same day&apos;s steps twice. We never sell HealthKit data, never
            share it with third parties for marketing or advertising, and never use it for data mining or tracking.
          </p>
          <p>
            <strong>Reports.</strong> If you report someone, we keep the report and what you wrote so we can review it
            and keep the community safe.
          </p>

          <h2>What is never stored</h2>
          <ul>
            <li>
              <strong>Your voice.</strong> In a duet game, the microphone moves your shovel, and your voice is relayed
              live to the friend you&apos;re playing with through Agora. It is never recorded or stored.
            </li>
            <li>
              <strong>Location.</strong> Apila does not collect or track your GPS location.
            </li>
          </ul>

          <h2>How we use it</h2>
          <p>
            Only to run Apila: to sign you in, keep your garden, journal, album, letters, and clovers in sync across your
            devices, show your planet to your friends, and keep the community safe. We don&apos;t sell your data, show
            ads, or track you across other apps and websites.
          </p>

          <h2>Who processes it</h2>
          <p>We use a few services to run Apila, and they handle your data only on our behalf:</p>
          <ul>
            <li>
              <strong>Supabase</strong>: account, database, step-clover claims, and character portraits
            </li>
            <li>
              <strong>Cloudflare</strong>: journal photos, Apila album photos, and postcard/letter photos
            </li>
            <li>
              <strong>Google</strong> and <strong>Apple</strong>: sign-in
            </li>
            <li>
              <strong>Agora</strong>: live voice in duet games (relayed, not recorded)
            </li>
          </ul>

          <h2>Keeping and deleting your data</h2>
          <p>
            We keep your data while you have an account. You can delete your account at any time in{" "}
            <strong>Settings → Delete account</strong>. This permanently deletes your account, planet, journal, album,
            photos, letters, Friend Cards, step claims, trees, and friendships, and revokes Sign in with Apple
            credentials where applicable. Trees your friends planted stay with them. Reports about other people may be
            kept to keep the community safe.
          </p>

          <h2>Children</h2>
          <p>
            Apila isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their data. If you
            believe a child has given us data, contact us and we&apos;ll delete it.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on where you live, you may have the right to access, correct, export, or delete your data. Most of
            this you can do in the app; for anything else, email <Email />.
          </p>

          <h2>Changes</h2>
          <p>
            If we change this policy, we&apos;ll update the date above and, for significant changes, tell you in the
            app.
          </p>

          <ContactCard title="Questions about your data?" />
        </div>
      </article>
    </>
  );
}
