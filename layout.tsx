// TRIAL ONLY: a minimal shell so Ask Veritas can be tried on its own Vercel project.
// Don't copy this file into the real site; there, mount <AskVeritas /> in the site's own root layout.
import type { Metadata } from "next";
import AskVeritas from "@/components/AskVeritas";

export const metadata: Metadata = {
  title: "Ask Veritas · Trial",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body style={{ margin: 0, minHeight: "100dvh", background: "#0f0f3d", color: "#fff" }}>
        {children}
        <AskVeritas />
      </body>
    </html>
  );
}
