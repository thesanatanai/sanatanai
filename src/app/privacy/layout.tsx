import { Metadata } from "next";

export const metadata: Metadata = {
    alternates: {
        canonical: "https://sanatan.shivam.click/privacy",
        languages: {
            hi: "https://sanatan.shivam.click/privacy/hi",
            en: "https://sanatan.shivam.click/privacy/"
        }
    }
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}