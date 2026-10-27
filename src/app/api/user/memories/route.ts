import verifyUser, { User } from "../../utils/verify";
import respondErr from "../../utils/respondErr";
import userModel from "../../models/user";
import dbConnect from "../../utils/db";
void dbConnect();

export async function GET() {
    const user = await verifyUser() as User;
    if(typeof user === "function") return user();
    const memories = user.memories || [];
    memories.sort((a, b) => b.length - a.length);
    return new Response(JSON.stringify(memories), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function DELETE(req: Request) {
    try {
    const memory = await req.text();
    const user = await verifyUser() as User;
    if(typeof user === "function") return user();

    const memories = user.memories || [];
    const idx = memories.indexOf(memory);
    if(idx < 0) return respondErr("Invalid request");

    const updated = memories.splice(idx, 1);
    const final = updated.length ? null : updated;

    await userModel.updateOne({ id: user.id }, { memories: final });

    return new Response("Done");
    } catch (e) {
        console.error(e);
        return respondErr("Invalid request");
    }
}