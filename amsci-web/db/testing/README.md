# QA fixtures — returning-customer password setup

The returning-customer flow is **one-way**. Setting a password clears
`must_change_password` permanently, burns the one-time token, and opens a 30-day
session, so a given account can only walk the flow once. That is why you run out
of accounts to test with.

These three scripts make the flow repeatable on disposable accounts.

| Script | When |
| --- | --- |
| `qa-returning-user-seed.sql` | Once, to create the fixtures |
| `qa-returning-user-rearm.sql` | Between every test pass |
| `qa-returning-user-teardown.sql` | Before launch, to delete them |

```bash
cd amsci-web
npx wrangler d1 execute amsci-catalog --remote --file=db/testing/qa-returning-user-seed.sql
# ... test ...
npx wrangler d1 execute amsci-catalog --remote --file=db/testing/qa-returning-user-rearm.sql
```

Edit the addresses in the seed script to mailboxes you actually receive before
running it. Plus-addressing (`you+qa1@domain`) delivers to the base mailbox on
Microsoft 365 and Google Workspace, so one inbox covers all seven fixtures.

## Why the `+qa` tag matters

Every statement in the re-arm and teardown scripts is scoped to
`email LIKE '%+qa%@%'`. No migrated WordPress address contains a `+qa` tag, so
these scripts are structurally incapable of wiping a real customer's password or
signing them out. Keep that predicate on anything you add.

## What to actually test

The happy path is the least interesting part — it is also the part already known
to work. These are the cases that break in production.

### Happy path (fixtures `+qa1` … `+qa5`)

1. `/login` with the fixture email and any old password → **409**, message
   directing to the setup link. Never a 401.
2. Request the link → email arrives from `hello@am-sci.com`.
3. **Open the link's href and read the host.** It comes from the `SITE_URL` var,
   not from the host you are browsing. If `SITE_URL` points somewhere that is not
   yet serving this app, every link in every email is dead — and the flow looks
   fine right up until a customer clicks one.
4. Set a password ≥10 chars → signed in, landed as a customer.
5. `/login` with the NEW password → 200. With the OLD password → 401.

### The cases that actually fail

| Case | Expected | Why it matters |
| --- | --- | --- |
| Click the same link twice | 2nd → "already used" | Mail scanners in Outlook/Defender pre-fetch links. If a scanner GET can redeem a token, the customer's link is dead before they click it. Verify redemption needs the POST. |
| Let a setup token sit >72h | "expired", new link works | Setup TTL is 72h, reset is 1h — a customer who reads mail on Monday is outside a 1h window. |
| Request two links, use the first | Both valid, each single-use | `createPasswordToken` deliberately does not invalidate priors. |
| Password of 9 chars | 400, no token burned | If a validation failure consumed the token the user is stranded with a used link and no password. |
| `+qapending` sets a password | Password stored, **no session**, login → 403 | An approved-looking success screen for an account that cannot sign in is the worst failure here. |
| `+qadenied` requests a link | Generic response, **no email sent** | Denied accounts must not receive setup mail. |
| Unknown address requests a link | Same generic response, same timing | Anti-enumeration. |
| Admin → "Resend setup" on `+qapending` | 409 telling the admin to approve instead | |

### Deployment check, before trusting any of the above

Password links are built from the deployed `SITE_URL`, and this project has a
history of merges that do not actually deploy. Confirm what is live first:

```bash
npx wrangler deployments list        # newest Created timestamp is the only honest signal
npx wrangler secret list             # RESEND_API_KEY, TURNSTILE_SECRET_KEY present?
```

A missing `RESEND_API_KEY` does not error — `sendPasswordEmail` falls back to
logging the link, so the flow appears to pass while no customer ever receives
mail. Watch `npx wrangler tail amsci-web --format json` during a test pass and
confirm a real send, not a fallback.
