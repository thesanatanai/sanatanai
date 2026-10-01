import { Metadata } from "next"

export const metadata: Metadata = {
    alternates: {
        canonical: "https://sanatan.shivam.click/welcome"
    }
}
export default function Layout({children}: Readonly<{
    children: React.ReactNode
}>) {
    return children
}