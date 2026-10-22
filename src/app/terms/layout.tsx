import { Metadata } from "next";

export const metadata: Metadata = {
    alternates: {
        canonical: "https://sanatan.shivam.click/terms",
        languages: {
            en: "https://sanatan.shivam.click/terms",
            hi: "https://sanatan.shivam.click/terms/hi"
        }
    }
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}