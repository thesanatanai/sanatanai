# Sanatan AI — Build Plan

A production-grade, dharma-focused conversational AI. Here's the full plan, from architecture down to folder structure.

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Styling | Tailwind CSS + shadcn/ui | fast, themeable primitives |
| Animation | Framer Motion + Lordicon | micro-interactions + lottie-style icons |
| State | Zustand | chat/session state, theme state |

## 2. Core Feature Set (yours + additions)

**Suggested additions:**
- **Daily Shloka widget**: verse-of-the-day on the landing/sidebar

- **Voice input** (Web Speech API) — dharma discourse often benefits from spoken query

---


# Sanatan AI - Review
## Critical: the system prompt is completely disconnected

I traced the full request path (`utils/message.tsx` → `POST /api/chat`), and it doesn't check out:

- `app/api/utils/systemPrompt.ts` contains your entire "Sanatan AI" persona — the Trimurti framing, shloka syntax contract, `push_memory`/`delete_memory`/`open`/`name` function-calling rules, the Google Search grounding claim — **but it's never imported anywhere.** I grepped the whole repo for `systemInstruction` and `systemPrompt`: zero references outside its own file.

## Security issues worth fixing before wider traffic
1. **Mass-assignment on two endpoints.** `PUT /api/user` does the same with the entire body onto the user document. Neither whitelists fields — a client can set any schema field to any value (e.g. overwrite their own `id`, which is the foreign key linking their chats). Fix: destructure only the allowed fields before the `$set`.
2. **Refresh Token** Add a refresh token support using *cookies*.
3. **OTP has no brute-force protection.** `POST /api/user/otp` checks a 6-digit code with no attempt limiting or lockout — scriptable within the 10-minute window. `PUT /api/user/otp` (the send-OTP endpoint) also has no rate limiting, so it can be used to spam arbitrary email addresses through your SMTP relay.

## Where I'd start
1. Wire `systemPrompt.ts` and a `tools` array into `/api/chat` — everything else (search grounding, memory, buttons, chat auto-naming) cascades from this.
2. Fix the mass-assignment endpoint
3. Add OTP rate limiting/lockout before this goes to real users.
