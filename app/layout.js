import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import Provider from './Provider'

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
  title: "AI Mock Interview | Land Your Dream Job",
  description: "Practice your interview skills with an AI-powered mock interviewer. Get instant feedback and improve your performance.",
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased`}>
        <Provider>
          <Toaster />
        {children}
        </Provider>
      </body>
    </html>
  );
}
