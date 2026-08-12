const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=UTF-8" }
});

const messageFromBrevo = payload => {
  if (!payload || typeof payload !== "object") return "Brevo rejected the email request.";
  if (typeof payload.message === "string") return payload.message;
  if (Array.isArray(payload.message)) return payload.message.join(", ");
  if (Array.isArray(payload.errors)) return payload.errors.map(error => error.message || String(error)).join(", ");
  return "Brevo rejected the email request.";
};

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ success: false, message: "Method not allowed. Use POST." }, 405);
    }

    try {
      let input;
      try {
        input = await request.json();
      } catch {
        return json({ success: false, message: "Invalid JSON request body." }, 400);
      }

      const to = typeof input?.to === "string" ? input.to.trim() : "";
      const customerName = typeof input?.customerName === "string" ? input.customerName.trim() : "";
      const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
      const html = typeof input?.html === "string" ? input.html.trim() : "";
      const attachment = input?.attachment && typeof input.attachment === "object" ? input.attachment : null;

      if (!to) return json({ success: false, message: "Email is required." }, 400);
      if (!validEmail(to)) return json({ success: false, message: "A valid recipient email is required." }, 400);
      if (!subject) return json({ success: false, message: "Subject is required." }, 400);
      if (!html) return json({ success: false, message: "HTML content is required." }, 400);
      if (attachment && (!/^[A-Za-z0-9+/=]+$/.test(String(attachment.content || "")) || !String(attachment.filename || "").trim())) return json({ success: false, message: "Invoice PDF attachment is invalid." }, 400);
      if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.BREVO_SENDER_NAME) {
        return json({ success: false, message: "Email service is not configured." }, 500);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let brevoResponse;
      try {
        brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": env.BREVO_API_KEY
          },
          body: JSON.stringify({
            sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
            to: [{ email: to, ...(customerName ? { name: customerName } : {}) }],
            subject,
            htmlContent: html,
            ...(attachment ? { attachment: [{ content: String(attachment.content), name: String(attachment.filename).trim() }] } : {})
          }),
          signal: controller.signal
        });
      } catch (error) {
        return json({ success: false, message: error.name === "AbortError" ? "Email provider request timed out." : "Could not connect to the email provider." }, 502);
      } finally {
        clearTimeout(timeout);
      }

      const raw = await brevoResponse.text();
      let brevoPayload = null;
      try { brevoPayload = raw ? JSON.parse(raw) : null; } catch { /* Brevo can return a non-JSON error body. */ }

      if (!brevoResponse.ok) {
        return json({ success: false, message: messageFromBrevo(brevoPayload) }, brevoResponse.status >= 400 && brevoResponse.status < 600 ? brevoResponse.status : 502);
      }

      return json({ success: true, message: "Reminder sent successfully." });
    } catch {
      return json({ success: false, message: "An unexpected server error occurred." }, 500);
    }
  }
};
