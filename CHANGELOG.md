# V-1.0.3
## Implement deep thinking
Now, deep thinking is supported and functional. API config is added with a verification.

## Add Google Analytics Support
Now, Google Analytics is enabled to track user actions and performance.

## Add Recording Feature
Now, Sanatan AI supports a verified speech recognition feature, users can now speak and type on their own if browser supports it.


# V-1.0.2
## Add OTP Rate Limiting
Now, OTP's are rate-limited to avoid pishing and other malpractices
## Introduce New Function Calls
New function calls including `add_memory`, `delete_memory` are introduced along with their respective functions for better UX.
## Bind System Prompt
Systrem Prompt, initially dead code, is now correctly binded with model for better accuracy.

# V-1.0.1
## Fix: critical auth, chat, and file-upload bugs

Fixes 12 verified bugs found during a full code audit (auth/cookies, chat
persistence, NoSQL-injection risk, unbounded tool-call recursion, and a
couple of frontend validation gaps). Every fix is checked against a clean
`npx tsc --noEmit`, a clean `npx eslint`, and a successful `npx next build`.

## Backend / API

### 1. Profile updates (`PUT /api/user`) wiped unrelated fields
`updateOne` always `$set` all three profile fields even when the client
only sent one (e.g. renaming just sends `{ name }`). The other two came
through as `undefined` and overwrote the stored `picture` /
`prefferedLocale`. Now only the fields actually present in the request
body are set.

### 2. Chat rename / timestamp updates silently no-op'd
`validateModifications` checked `thing instanceof String/Number`, but
`JSON.parse` produces primitives, which are never `instanceof` their boxed
wrapper types. Only `messages` (an array) ever passed. `PUT /api/chats`
still returned `{ message: "Done" }`, so renaming a chat looked like it
worked but never touched the DB. Replaced with `typeof`/`Array.isArray`
checks, and the route now returns an explicit error if nothing valid was
submitted instead of a false "Done".

### 3. `DELETE /api/user` (logout-all-devices) never returned a response
The success path fell off the end of the function with no `return`, and
the outer `catch` called `respondErr(...)` without `return`ing it either.
Next.js would throw "No response returned from route handler." Both paths
now return properly, and the outer catch message typo (`"cardential"`)
is fixed too.

### 4. `proxy.ts` cleared cookies on the wrong object
`req.cookies.clear()` mutates the *incoming request's* cookie jar, which
has no effect on the user's browser. Invalid/stale `token` /
`setupComplete` cookies were never actually removed client-side. Now
cookies are deleted on the outgoing `NextResponse` instead.

### 5. Inconsistent, incorrect cookie expiry math
Two call sites computed `expires: Date.now() + 365 * 24 * 3600 * 900`
(missing the `*1000` to go from seconds → ms — cookie actually expired in
~328 days, not 365), while a third used the correct `*1000`. Pulled into
one `ONE_YEAR_MS` constant (`app/api/utils/constants.ts`) used everywhere,
so the cookie and the JWT it stores always agree on lifetime.

### 6. Guest OTP signup issued a JWT with no expiry
Every other login path signs with `expiresIn: "1year"`; the brand-new-user
OTP path didn't set `expiresIn` at all, so that token lived forever even
after its cookie expired. Now consistent with the rest.

### 7. Unvalidated `email` reaching MongoDB queries
`email` from `request.json()` was passed straight into
`otpModel.findOne({ email })` / `userModel.findOne({ email })` with no
type check, which would let an object like `{"$gt": ""}` be interpreted as
a query operator instead of a value (NoSQL injection risk). Added
`isValidEmail()` and applied it at the top of every
route/query that touches a caller-supplied email.

### 8. Chat IDs were never actually checked for uniqueness
`createNewChat` called `generateUniqueId()` with no model argument, so the
DB uniqueness check inside was skipped entirely. `generateUniqueId` also
hardcoded the field name (`id`), which is wrong for chats — a chat
document's `id` field holds the *owning user's* id, not the chat's own id
(`chatId`). Added an optional `field` parameter and now call it as
`generateUniqueId(chatModel, "chatId")`.

### 9. Unbounded function-call recursion in the chat stream
`app/api/chat/stream.ts` recursively restarted the stream on every
server-side tool call (`web_search`/`web_fetch`) with no depth limit — a
model that kept chaining tool calls could loop indefinitely, holding the
connection open and burning API quota. Added a `MAX_TOOL_CALL_STEPS = 8`
guard that stops the chain, tells the frontend why, and persists whatever
was generated so far instead of silently discarding it. Also replaced the
non-standard `this.start.bind(this)` re-entry with a plain recursive
`runTurn()` helper — same behavior, easier to reason about and to cap.

### 10. `POST /api/chat` swallowed all errors
The `catch` block only logged and returned nothing, which Next.js turns
into an unhandled "no response" failure with no error payload reaching
the client. Now returns a proper `respondErr(...)`.

## Frontend

### 11. File upload cap could be bypassed in a single batch
`utils/useFileManager.tsx` only checked `stateFiles.length == 3` once
before looping over the newly selected files, so selecting several files
at once (e.g. 5 while already holding 1) let the total exceed the
intended 3-file limit. Now slices the incoming batch to the remaining
slot count and warns the user.

### 12. Unsupported files were silently mislabeled instead of rejected
Any file type not in `supportedFiles` was relabeled `text/plain` and sent
to the model anyway (e.g. a `.zip` or `.exe`), wasting tokens on garbage.
Now rejected with a new `unsupportedFileType` notification (added to both
English and Hindi locale tables), while real text files still pass
through as before.


# V-1.0.0
Initilize Sanatan AI application with initial features , UI and logic.