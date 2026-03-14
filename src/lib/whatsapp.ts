/**
 * WhatsApp Cloud API (Meta Graph API v21.0) utility.
 *
 * Sends text messages via the official WhatsApp Business API.
 * Requires env vars:
 *   - WHATSAPP_ACCESS_TOKEN  — Bearer token from Meta Developer portal
 *   - WHATSAPP_PHONE_NUMBER_ID — From WhatsApp Business settings
 *
 * Phone numbers must be in international format without + or spaces: "919876543210"
 */

const GRAPH_API_VERSION = "v21.0";

function getConfig(): { accessToken: string; phoneNumberId: string } | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return null;
  }

  return { accessToken, phoneNumberId };
}

/**
 * Check whether WhatsApp sending is configured (env vars present).
 */
export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Normalize a phone number to international format without + or spaces.
 * Strips +, spaces, dashes, parentheses.
 */
export function normalizePhoneNumber(raw: string): string {
  return raw.replace(/[+\s\-()]/g, "");
}

interface WhatsAppApiResponse {
  readonly messaging_product: string;
  readonly contacts?: ReadonlyArray<{ input: string; wa_id: string }>;
  readonly messages?: ReadonlyArray<{ id: string }>;
  readonly error?: {
    message: string;
    type: string;
    code: number;
  };
}

/**
 * Send a plain text WhatsApp message.
 *
 * Note: Text messages work without template approval within the 24h
 * customer service window. For proactive messages outside this window,
 * approved templates are needed (not implemented yet).
 */
export async function sendWhatsAppText(
  to: string,
  text: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  if (!config) {
    return {
      success: false,
      error: "WhatsApp not configured (missing env vars)",
    };
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo || normalizedTo.length < 10) {
    return { success: false, error: `Invalid phone number: "${to}"` };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body: text },
      }),
    });

    const data: WhatsAppApiResponse = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
      console.error("[sendWhatsAppText] API error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendWhatsAppText] Error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send a WhatsApp template message (for pre-approved templates).
 * Not used yet — placeholder for future template-based notifications.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: ReadonlyArray<object>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();
  if (!config) {
    return {
      success: false,
      error: "WhatsApp not configured (missing env vars)",
    };
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo || normalizedTo.length < 10) {
    return { success: false, error: `Invalid phone number: "${to}"` };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components,
        },
      }),
    });

    const data: WhatsAppApiResponse = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
      console.error("[sendWhatsAppTemplate] API error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendWhatsAppTemplate] Error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
