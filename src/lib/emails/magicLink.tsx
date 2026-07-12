import { render } from "@react-email/render";

import { resend } from "./resend";
import { MagicLink } from "./templates/MagicLink";

const BRAND = "Alynx";
const FROM = `${BRAND} <hello@alynx.agency>`;
const REPLY_TO = "hello@alynx.agency";

export const sendMagicLink = async (email: string, url: string) => {
  const element = <MagicLink url={url} brand={BRAND} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    replyTo: REPLY_TO,
    subject: `Your ${BRAND} sign-in link`,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": crypto.randomUUID(),
    },
  });

  if (error) {
    console.error("[magicLink] resend error", error);
    throw new Error(`Failed to send magic link: ${error.message}`);
  }

  return data;
};
