import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Providers from "./provider"

const geistSans = Geist({
        variable: "--font-geist-sans",
        subsets: ["latin"],
})

const geistMono = Geist_Mono({
        variable: "--font-geist-mono",
        subsets: ["latin"],
})

export const metadata: Metadata = {
        title: "KeyBox",
        description: "KeyBox",
        icons: {
                icon: "/key.svg",
        },
        openGraph: {
                title: "KeyBox",
                description: "KeyBox - Secure Key Management",
                url: "https://keybox.app",
                siteName: "KeyBox",
                images: [
                        {
                                url: "/og.png",
                                width: 1200,
                                height: 630,
                        },
                ],
                locale: "en_US",
                type: "website",
        },
        twitter: {
                card: "summary_large_image",
                title: "KeyBox",
                description: "KeyBox - Secure Key Management",
                images: ["/og.png"],
        },
}

export default function RootLayout({
        children,
}: {
        children: React.ReactNode
}) {
        return (
                <html lang="en">
                        <body
                                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                        >
                                <Providers>{children}</Providers>
                        </body>
                </html>
        )
}
