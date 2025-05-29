import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";

import { Header } from "@/components/header";
import { SponsorsBanner } from "@/components/sponsors-banner";
import { GA_TRACKING_ID } from "@/lib/gtag";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    metadataBase: new URL("https://archifusion.netlify.app"),
    title: "ArchiFusion - AI Architectural Designer",
    description:
        "Transform your architectural ideas into stunning 3D building models. From text descriptions to detailed floor plans - houses, offices, retail spaces, and more.",
    openGraph: {
        title: "ArchiFusion - AI Architectural Designer",
        description: "Transform architectural ideas into stunning 3D building models with AI",
        url: "https://archifusion.netlify.app",
        siteName: "ArchiFusion",
        images: [
            {
                url: "/og.jpg",
                width: 1200,
                height: 630,
                alt: "ArchiFusion - AI Architectural Designer",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "ArchiFusion - AI Architectural Designer",
        description: "Transform architectural ideas into stunning 3D building models with AI",
        images: ["/og.jpg"],
    },
    icons: {
        icon: [
            { url: "/logo.svg", type: "image/svg+xml" }, // Add SVG logo as primary favicon
            { url: "/favicon.ico" }, // Keep .ico as fallback for older browsers
            { url: "/icon.png", type: "image/png", sizes: "32x32" },
            { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
            { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
        ],
        apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
                {GA_TRACKING_ID && (
                    <>
                        <Script
                            strategy="afterInteractive"
                            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
                        />
                        <Script
                            id="gtag-init"
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${GA_TRACKING_ID}', {
                                        page_path: window.location.pathname,
                                    });
                                `,
                            }}
                        />
                    </>
                )}
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <div className="flex flex-col h-screen overflow-hidden">
                        <Header />
                        <main className="relative flex-1 overflow-y-auto focus:outline-none">
                            {children}
                        </main>
                    </div>
                    <SponsorsBanner />
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
