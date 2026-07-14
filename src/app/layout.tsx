import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Buenas Nuevas | Iglesia Evangélica Bautista — Oberá, Misiones",
  description:
    "Iglesia Evangélica Bautista Buenas Nuevas, Oberá, Misiones. Calle Mensú 1177. No somos una organización religiosa, somos el Pueblo de Dios.",
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
