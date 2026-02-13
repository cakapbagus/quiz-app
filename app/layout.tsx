import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizSpin - Roda Kuis Interaktif",
  description: "Roda undian kuis interaktif untuk berbagai mata pelajaran",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
