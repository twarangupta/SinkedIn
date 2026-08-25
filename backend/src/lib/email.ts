/**
 * Owner email notifications — a thin, dependency-free wrapper over Resend's HTTP
 * API (https://resend.com). We call it with plain `fetch` (Node 18+ global), so
 * there is no SDK package to install.
 *
 * It is a NO-OP until configured: if `RESEND_API_KEY` is absent, `sendOwnerEmail`
 * simply logs and returns. So features that notify the owner (feedback now, the
 * weekly digest later) work end-to-end today — the row is always stored — and
 * email turns on the moment the key is added, with no code change.
 *
 * Env:
 *  - RESEND_API_KEY   — enables sending (from the Resend dashboard).
 *  - OWNER_EMAIL      — where owner notifications go (default: the owner's inbox).
 *  - FEEDBACK_FROM    — from-address (default: Resend's shared onboarding sender,
 *                       which can email the account owner without a verified
 *                       domain — perfect for owner-only notifications).
 */

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'twaranguptawork@gmail.com';
const FROM = process.env.FEEDBACK_FROM ?? 'SinkedIn <onboarding@resend.dev>';

/**
 * Send a plain-text email to the site owner. Best-effort: never throws — a
 * failed or unconfigured send must not break the request that triggered it.
 * `replyTo` lets the owner reply straight to a user who left their address.
 */
export async function sendOwnerEmail(
  subject: string,
  text: string,
  replyTo?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Not configured yet — the caller has already persisted the data.
    // eslint-disable-next-line no-console
    console.info('[email] RESEND_API_KEY not set; skipping owner email:', subject);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [OWNER_EMAIL],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[email] Resend send failed:', res.status, await res.text());
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Resend send threw:', err);
  }
}
