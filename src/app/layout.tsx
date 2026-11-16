import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CursorProvider } from "@/components/motion/cursor-provider";
import { themeNoFlashScript } from "@/lib/theme";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/config/app";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

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
        <script
          dangerouslySetInnerHTML={{ __html: themeNoFlashScript }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        <CursorProvider>
          <Providers>{children}</Providers>
        </CursorProvider>
      </body>
    </html>
  );
}
