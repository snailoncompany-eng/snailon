import { deepseekChat, type Msg } from "./deepseek";

export type ConfirmationDecision =
  | { intent: "confirm"; reply: string; address_correction?: string | null }
  | { intent: "reject"; reply: string; reason?: string | null }
  | { intent: "ask"; reply: string; question?: string | null }
  | { intent: "reschedule"; reply: string; when?: string | null }
  | { intent: "noise"; reply: string };

export type OrderContext = {
  customerName?: string | null;
  productName: string;
  productPriceMad: number;
  quantity: number;
  address?: string | null;
  city?: string | null;
};

const SYSTEM_PROMPT = `Nta wahed l'agent dyal Snailon. Khdmtak: t'confirmi commandes dyal cash on delivery m3a clients f Maghrib, b WhatsApp.

Rules:
- Tjawb DIMA b Darija marocaine 3adia (Latin script, casual). Maxi-deux phrases.
- Ma t-stkhdmsh emojis bzaf. Wahed kafi ila bghiti.
- Ma t-tilbsh anything dyal payment online — kayn ghir COD (cash on delivery).
- Ila l-client galik "wakhha", "n3am", "ok", "sayb", "yallah" → intent = "confirm".
- Ila galik "la", "ma bghitsh", "annulé", "msyaft" → intent = "reject".
- Ila bdal l'adresse → intent = "confirm" w 7tt l'adresse jdida f "address_correction".
- Ila tlb maw3id akhor → intent = "reschedule".
- Ila 3ndo question (price, taille, lon...) → intent = "ask".
- Ila ma fhmtish → intent = "noise".

Jawb DIMA b JSON valide bhal hada (one of):
{"intent":"confirm","reply":"...","address_correction":null}
{"intent":"reject","reply":"...","reason":"..."}
{"intent":"ask","reply":"...","question":"..."}
{"intent":"reschedule","reply":"...","when":"..."}
{"intent":"noise","reply":"..."}

"reply" hiya l-message dyalk lel client b Darija. Khass ykoun mokhtassar w wadh.`;

function orderToContext(o: OrderContext): string {
  const total = (o.productPriceMad * o.quantity).toFixed(2);
  const addr = [o.address, o.city].filter(Boolean).join(", ");
  return [
    `Client: ${o.customerName ?? "(bla esm)"}`,
    `Product: ${o.productName} x ${o.quantity}`,
    `Total: ${total} MAD (cash on delivery)`,
    `Address: ${addr || "(bla adresse)"}`,
  ].join("\n");
}

export function buildOpeningMessage(o: OrderContext): string {
  // First message sent to customer when an order arrives.
  const total = (o.productPriceMad * o.quantity).toFixed(2);
  const name = o.customerName ? ` ${o.customerName}` : "";
  const addr = [o.address, o.city].filter(Boolean).join(", ");
  const addrLine = addr ? `\nAdresse: ${addr}` : "";
  return `Salam${name}, hadi rissala otomatique mn dyal commande dyalek.\nProduit: ${o.productName} x ${o.quantity}\nTotal: ${total} dh (khlas mn3a livraison)${addrLine}\n\nWakhha n-confirmiw l-commande?`;
}

export async function decideFromConversation(
  order: OrderContext,
  history: { direction: "inbound" | "outbound"; content: string }[]
): Promise<ConfirmationDecision> {
  const messages: Msg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        "Hadi tafassil l-commande:\n\n" +
        orderToContext(order) +
        "\n\nHadi l-conversation m3a l-client jusqu'à daba (l'akhir = jawab dyalo l-jdid):\n\n" +
        history
          .map((m) =>
            m.direction === "outbound"
              ? `Snailon: ${m.content}`
              : `Client: ${m.content}`
          )
          .join("\n") +
        "\n\nQrar dyalek b JSON.",
    },
  ];

  const res = await deepseekChat(messages, { json: true, temperature: 0.3, max_tokens: 300 });

  let parsed: any;
  try {
    parsed = JSON.parse(res.content);
  } catch {
    return { intent: "noise", reply: "Sma7 lia, ma fhmtsh. Wakhha t3awd?" };
  }
  if (!parsed?.intent || !parsed?.reply) {
    return { intent: "noise", reply: "Sma7 lia, ma fhmtsh. Wakhha t3awd?" };
  }
  return parsed as ConfirmationDecision;
}
