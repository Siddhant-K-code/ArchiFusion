import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

import { Header } from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "ArchiFusion - AI Architectural Designer",
    description:
        "Transform your architectural ideas into stunning 3D building models. From text descriptions to detailed floor plans - houses, offices, retail spaces, and more.",
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
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
