/**
 * Optional post-provision notice with the private entry URL.
 * Uses Resend when RESEND_API_KEY is set; otherwise logs for operators.
 */

export interface EntryLinkNotice {
  to: string;
  tenantName: string;
  tenantUrl: string;
  entryUrl: string;
  fromEmail?: string;
}

export async function notifyEntryLink(notice: EntryLinkNotice): Promise<void> {
  const to = notice.to.trim();
  if (!to || !to.includes("@")) {
    console.log(`[entry-link] no email for ${notice.tenantName}; entry URL: ${notice.entryUrl}`);
    return;
  }

  console.log(`[entry-link] ${notice.tenantName} → ${to}: ${notice.entryUrl}`);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from = (notice.fromEmail || process.env.RESEND_FROM_EMAIL || "Kosmos <onboarding@resend.dev>").trim();
  const subject = `Your Kosmos invitation link (${notice.tenantName})`;
  const text = [
    `Your Kosmos instance is ready.`,
    ``,
    `Open this private invitation link once to unlock the instance in your browser:`,
    notice.entryUrl,
    ``,
    `Bookmark that link. The public URL (${notice.tenantUrl}) stays locked without it.`,
    ``,
    `If you lose the link, recover it at https://kosmos-control-plane.fly.dev/signin with this email.`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[entry-link] Resend failed (${res.status}): ${body}`);
  }
}
