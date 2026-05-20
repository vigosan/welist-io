const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "welist <onboarding@resend.dev>";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
  listUnsubscribeUrl?: string;
};

type SendResult =
  | { skipped: true; reason: "no_api_key" }
  | { skipped: false; id: string };

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true, reason: "no_api_key" };
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (args.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${args.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return { skipped: false, id: data.id };
}
