import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { brand } from "@/lib/brand";
import { hasClerkPublishable } from "@/lib/env";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.tagline,
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#e4702e",
    colorBackground: "#ffffff",
    colorText: "#201c18",
    colorTextSecondary: "#5e564e",
    colorInputBackground: "#ffffff",
    borderRadius: "14px",
    fontFamily: "var(--font-figtree), system-ui, sans-serif",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className="min-h-dvh">
        {hasClerkPublishable ? <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
