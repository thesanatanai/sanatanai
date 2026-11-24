import AppBootstrap from "./AppBootstrap";
import "./globals.css";
import { Notification } from "@/components/Notification";

export default function Layout({
    children
}: Readonly<{
  children: React.ReactNode;
}>) {
    
    return (
    <AppBootstrap>
        <Notification />
        {children}
    </AppBootstrap>
    )
}