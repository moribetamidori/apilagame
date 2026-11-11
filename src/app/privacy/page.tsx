import type { Metadata } from "next";
import { ContactCard } from "@/components/ContactCard";
import { DocHero } from "@/components/DocHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Apila: Flower Friends collects, why, and what you can do about it.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "November 11, 2026";

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
            you share it, your name. Your account also has a username and display name you choose. If you use
            Apple&apos;s &quot;Hide My Email&quot;, we only see the relay address Apple gives us.
          </p>
          <p>
            <strong>What you make in Apila.</strong> Your planet (its land, paint, plants, decorations and gifts), your
            plans, your journal entries and the photos you add to them, trees you grow with friends and the notes you
            leave on them, and a picture of your Apila character so friends can see it.
          </p>
          <p>
            <strong>Your friends.</strong> Who you&apos;ve invited, who you&apos;re friends with, and who you&apos;ve
            blocked. Friends can see your display name, username, character and planet, and when you were last around.
          </p>
          <p>
            <strong>Reports.</strong> If you report someone, we keep the report and what you wrote so we can review it.
          </p>

          <h2>What stays on your phone</h2>
          <ul>
            <li>
              <strong>Walks.</strong> Your location during a walk you start, the route, and the daily heatmap are kept
              only on your phone. We never receive them.
            </li>
            <li>
              <strong>Steps and health data.</strong> Apila reads your step count from Apple Health and motion data to
              show your movement. This data stays on your phone. We don&apos;t send it anywhere, use it for advertising,
              or share it with anyone.
            </li>
            <li>
              <strong>Your voice.</strong> In a duet game, the microphone moves your shovel, and your voice is sent live
              to the friend you&apos;re playing with. It is never recorded or stored.
            </li>
          </ul>

          <h2>How we use it</h2>
          <p>
            Only to run Apila: to sign you in, keep your garden and journal in sync across your devices, show your planet
            to your friends, and keep the community safe. We don&apos;t sell your data, show ads, or track you across
            other apps and websites.
          </p>

          <h2>Who processes it</h2>
          <p>We use a few services to run Apila, and they handle your data only on our behalf:</p>
          <ul>
            <li>
              <strong>Supabase</strong>: account, database and character pictures
            </li>
            <li>
              <strong>Cloudflare</strong>: journal photos
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
            <strong>Settings → Delete account</strong>. This permanently deletes your account, planet, journal, photos,
            trees and friendships. Trees your friends planted stay with them. Reports about other people may be kept to
            keep the community safe.
          </p>

          <h2>Children</h2>
          <p>
            Apila isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their data. If you
            believe a child has given us data, contact us and we&apos;ll delete it.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on where you live, you may have the right to access, correct, export or delete your data. Most of
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
