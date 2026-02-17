import type { Metadata } from "next";
import "./globals.css";
import SettingsButton from './SettingsButton';

export const metadata: Metadata = {
  title: "WAVER - Music Ocean",
  description: "Experience music as an ocean",
  icons: {
    icon: '/icon.svg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-[#fcfcfc] dark:bg-[#000000] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500/10`}>
        {children}
        <SettingsButton />
      </body>
    </html>
  );
}