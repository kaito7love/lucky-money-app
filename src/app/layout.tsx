import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { SessionProvider } from "@/lib/SessionContext";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700", "800"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Lucky Money - Lì Xì Nhóm",
  description: "Tạo bao lì xì nhóm, chia sẻ qua QR, nhận lì xì may mắn dịp Tết.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <div className="lg:flex lg:min-h-screen">
            <Sidebar />
            <div className="mx-auto w-full max-w-md min-h-screen flex flex-col lg:max-w-none lg:flex-1 lg:mx-0">
              {children}
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
