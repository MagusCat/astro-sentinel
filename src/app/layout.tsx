import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { PwaRegister } from "@/components/shared";
import "../styles/globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sentinel",
  description: "Modern, streamlined dashboard for martial arts, dance academies, pole sport studios, and recreational centers.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sentinel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={openSans.variable} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
