import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/site";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
});

// VT323, the pixel font used in the app (SIL Open Font License, see fonts/OFL.txt).
const pixel = localFont({
  src: "./fonts/VT323-Regular.ttf",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.shortName}` },
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.tagline,
    url: "/",
    siteName: site.name,
    images: ["/assets/icon.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF8E8",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${pixel.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
