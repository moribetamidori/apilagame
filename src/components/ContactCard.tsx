import Image from "next/image";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export function ContactCard({ title, subject, children }: { title: string; subject?: string; children?: ReactNode }) {
  const href = `mailto:${site.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <div className="contact-card">
      <Image src="/assets/apila-front.png" alt="" width={56} height={118} />
      <div>
        <strong>{title}</strong>
        <a href={href}>{site.email}</a>
        {children}
      </div>
    </div>
  );
}
