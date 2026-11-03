import { NextResponse } from "next/server";

type Message = { to?: string; subject?: string; html?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: Message[] } | null;
  const messages = (body?.messages ?? []).filter(
    (item) => item.to?.includes("@") && item.subject && item.html,
  );
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, message: "Chybí příjemci." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || "Farní služby <noreply@resend.dev>";
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      delivered: false,
      reason: "missing_resend_key",
    });
  }

  const results = await Promise.all(
    messages.map(async (item) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [item.to],
          subject: item.subject,
          html: item.html,
        }),
      });
      return response.ok;
    }),
  );

  return NextResponse.json({ ok: true, delivered: results.every(Boolean) });
}
