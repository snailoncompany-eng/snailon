import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM ?? "Snailon <noreply@snailon.com>";

export async function sendOrderConfirmedEmail(to: string, params: {
  customerName?: string | null;
  productName: string;
  total: number;
  address?: string | null;
}) {
  const subject = `Order confirmed — ${params.productName}`;
  const html = `
    <div style="font-family:ui-sans-serif,system-ui;max-width:520px;margin:auto;padding:24px;background:#FAF7F2;color:#0E0E0C">
      <p style="font-family:'Instrument Serif',serif;font-size:28px;letter-spacing:-0.02em;margin:0 0 16px">Order confirmed.</p>
      <p style="margin:0 0 8px"><b>${params.customerName ?? "Customer"}</b></p>
      <p style="margin:0 0 8px">${params.productName} — ${params.total.toFixed(2)} MAD</p>
      ${params.address ? `<p style="margin:0 0 8px">${params.address}</p>` : ""}
      <hr style="border:none;border-top:1px solid #EDE6D9;margin:24px 0"/>
      <p style="font-size:12px;color:#7A3722;margin:0">Snailon</p>
    </div>`;
  return getResend().emails.send({ from: FROM, to, subject, html });
}

export async function sendWaitlistThanks(to: string) {
  const subject = "You're on the Snailon list.";
  const html = `
    <div style="font-family:ui-sans-serif,system-ui;max-width:520px;margin:auto;padding:24px;background:#FAF7F2;color:#0E0E0C">
      <p style="font-family:'Instrument Serif',serif;font-size:28px;letter-spacing:-0.02em;margin:0 0 16px">Mar7ba bik.</p>
      <p>You're on the list. We launch May 21, 2026. We'll write again the day before.</p>
      <p style="font-size:12px;color:#7A3722;margin-top:24px">Snailon — fast confirmations, real deliveries.</p>
    </div>`;
  return getResend().emails.send({ from: FROM, to, subject, html });
}
