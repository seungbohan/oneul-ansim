import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientProviders from "@/components/providers/ClientProviders";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "오늘안심 - 생활안심 도우미",
  description: "어르신을 위한 생활안심 AI 도우미",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "오늘안심",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#2d5a27",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${notoSansKR.className} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
        <ErrorBoundary>
          <ClientProviders>
            {/* 키보드 사용자를 위한 건너뛰기 링크 */}
            <a
              href="#main-content"
              className="
                sr-only focus:not-sr-only
                fixed top-2 left-2 z-[300]
                bg-primary text-white
                px-4 py-2 rounded-xl font-bold
              "
            >
              본문으로 건너뛰기
            </a>
            <main id="main-content" className="mx-auto max-w-lg min-h-dvh">
              {children}
            </main>
            <BottomNav />
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
