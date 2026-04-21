import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quiet — The Compliance Passport for UK Locum Doctors",
  description: "Quiet (formerly WhatTheBleep) connects UK locum doctors with top medical recruitment agencies. Store your GMC certificate, DBS, Right to Work and compliance documents in one secure place. Share instantly with agencies. Free to join.",
  keywords: [
    "locum doctor platform UK",
    "medical recruitment UK",
    "GMC compliance passport",
    "locum doctor jobs UK",
    "doctor agency platform",
    "NHS locum doctors",
    "medical compliance documents",
    "locum work UK",
    "doctor recruitment platform",
    "WhatTheBleep",
    "Quiet medical platform",
    "quietmedical.co.uk",
    "locum agency UK",
    "doctor compliance vault",
    "medical staffing UK"
  ],
  authors: [{ name: "Quiet", url: "https://quietmedical.co.uk" }],
  creator: "Quiet",
  publisher: "Quiet",
  metadataBase: new URL("https://quietmedical.co.uk"),
  alternates: {
    canonical: "https://quietmedical.co.uk",
  },
  openGraph: {
    type: "website",
    url: "https://quietmedical.co.uk",
    title: "Quiet — The Compliance Passport for UK Locum Doctors",
    description: "Formerly WhatTheBleep. Quiet connects UK locum doctors with top medical recruitment agencies. One secure place for all your compliance documents. Free to join.",
    siteName: "Quiet",
    images: [
      {
        url: "https://quietmedical.co.uk/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quiet — UK Locum Doctor Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiet — The Compliance Passport for UK Locum Doctors",
    description: "Formerly WhatTheBleep. Connect with top UK medical agencies. Store and share your compliance documents securely.",
    images: ["https://quietmedical.co.uk/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "g93CQi5UEBagkgnpNlmUh_pMwdLqxcjsULpa2X85oHI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}