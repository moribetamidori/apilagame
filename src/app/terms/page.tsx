import type { Metadata } from "next";
import Link from "next/link";
import { ContactCard } from "@/components/ContactCard";
import { DocHero } from "@/components/DocHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Apila: Flower Friends, and the community guidelines that keep it gentle.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "November 25, 2026";

export default function TermsPage() {
  return (
    <>
      <DocHero title="Terms of Service & Community Guidelines">
        <p>
          <em>Last updated: {LAST_UPDATED}</em>
        </p>
      </DocHero>

      <article className="doc">
        <div className="wrap">
          <p>
            Welcome to Apila! By creating an account or using Apila, you agree to these Terms of Service
            (&quot;Terms&quot;) and our <Link href="/privacy">Privacy Policy</Link>. Apila is operated by {site.owner}{" "}
            (&quot;we&quot;). Contact: <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>

          <h2>1. Eligibility &amp; Your Account</h2>
          <p>
            You must be at least 13 years old (or the minimum age required in your country) to use Apila. You are
            responsible for keeping your account secure and for all activity under your account.
          </p>

          <h2>2. Zero Tolerance for Objectionable Content &amp; Abusive Users</h2>
          <p>
            Apila is a gentle space to grow gardens with friends. We have <strong>zero tolerance</strong> for
            objectionable content or abusive behavior. You agree <strong>not</strong> to post, send, or share any content
            (including usernames, display names, notes, letters, postcards, photos, or live duet voice audio) that:
          </p>
          <ul>
            <li>Harasses, bullies, threatens, stalks, or intimidates another person;</li>
            <li>Contains hate speech, slurs, or discrimination;</li>
            <li>Contains sexually explicit, pornographic, violent, or graphic content;</li>
            <li>Promotes self-harm, illegal acts, or spam; or</li>
            <li>Infringes anyone else&apos;s privacy or intellectual property rights.</li>
          </ul>

          <h2>3. Reporting, Blocking &amp; Moderation</h2>
          <ul>
            <li>
              You can <strong>report</strong> any user or content and <strong>block</strong> any user directly in Apila
              (from the Friends list, incoming friend requests, friend cards, postcards/letters, planet notes, tree
              notes, or duet games).
            </li>
            <li>Blocking a user immediately removes them from your friends and hides their content from you.</li>
            <li>
              We review all user reports within <strong>24 hours</strong> and will remove objectionable content and
              suspend or permanently eject offending accounts.
            </li>
          </ul>

          <h2>4. Your Content</h2>
          <p>
            You keep ownership of the journals, photos, letters, and creations you make in Apila. You grant us a limited
            license to host, process, and display your content solely to operate Apila (for example, showing your
            planet, shared trees, and postcards to your friends).
          </p>

          <h2>5. Account Deletion</h2>
          <p>
            You may permanently delete your account and associated data at any time in{" "}
            <strong>Settings → Delete account</strong>.
          </p>

          <h2>6. Disclaimers &amp; Changes</h2>
          <p>
            Apila is provided &quot;as is&quot; without warranties of any kind. We may update these Terms from time to
            time; continuing to use Apila after changes take effect means you accept the updated Terms.
          </p>

          <ContactCard title="Questions about these terms?" />
        </div>
      </article>
    </>
  );
}
