import AllContext from "./AllContext";
import "../globals.css";
import { Notification } from "@/components/Notification";

export default function Layout({
    children
}: Readonly<{
  children: React.ReactNode;
}>) {
    
    return (
    <AllContext>
        <Notification />
        {children}
    </AllContext>
    )
}