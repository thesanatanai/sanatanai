import verifyUser, { User } from "../../utils/verify";
import respondErr from "../../utils/respondErr";

export async function GET() {
    const user = await verifyUser() as User;
    if(typeof user == "function") return respondErr("Unauthorized", 401);
    const memories = user.memories || [];
    return new Response(JSON.stringify(memories), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}