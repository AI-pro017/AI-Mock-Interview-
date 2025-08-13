import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import Provider from './Provider'
import ChatAssistant from '@/components/ui/chat-assistant'
import { siteConfig, defaultOpenGraph, defaultTwitter } from '@/lib/seo'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  openGraph: defaultOpenGraph,
  twitter: defaultTwitter,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: '/favicon.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased`}>
        <Provider>
          <Toaster theme="dark" />
        {children}
        <ChatAssistant />
        </Provider>
      </body>
    </html>
  );
}
