import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CursorProvider } from "@/components/motion/cursor-provider";
import { themeNoFlashScript } from "@/lib/theme";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/config/app";

export const metadata: Metadata = {
  title: `${APP_NAME} — Get on board. Know you arrived.`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "Aboard",
    "Ghana",
    "bus booking",
    "student travel",
    "Cape Coast",
    "inter-city",
    "live tracking",
    "QR ticket",
  ],
  authors: [{ name: APP_NAME }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: `${APP_NAME} — Get on board. Know you arrived.`,
    description: APP_DESCRIPTION,
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF6EC" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1612" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts loaded via <link> (avoids next/font/google Turbopack issue) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-inter: 'Inter', ui-sans-serif, system-ui, sans-serif;
            --font-jetbrains: 'JetBrains Mono', ui-monospace, monospace;
            --font-fraunces: 'Fraunces', Georgia, 'Times New Roman', serif;
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{ __html: themeNoFlashScript }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <CursorProvider>
          <Providers>{children}</Providers>
        </CursorProvider>
      </body>
    </html>
  );
}
