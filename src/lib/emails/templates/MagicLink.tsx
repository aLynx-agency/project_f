import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type MagicLinkProps = {
  url: string;
  brand?: string;
  expiresInMinutes?: number;
};

export const MagicLink = ({ url, brand = "Alynx", expiresInMinutes = 15 }: MagicLinkProps) => {
  const preview = `Your ${brand} sign-in link. Expires in ${expiresInMinutes} minutes.`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="m-0 bg-[#f6f6f7] p-0 font-sans text-slate-900">
          <Container className="mx-auto max-w-120 px-4 py-8">
            <Section className="rounded-xl bg-white p-8">
              <Text className="m-0 mb-5 text-base font-semibold">Sign in to {brand}</Text>
              <Text className="m-0 mb-6 text-[15px] leading-6">
                Click the button below to sign in. This link is valid for the next{" "}
                {expiresInMinutes} minutes and can only be used once.
              </Text>
              <Button
                href={url}
                className="mb-7 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white no-underline"
              >
                Sign in to {brand}
              </Button>
              <Text className="m-0 mb-1.5 text-[13px] text-slate-500">
                Or paste this URL into your browser:
              </Text>
              <Text className="m-0 text-[13px] break-all text-slate-500">{url}</Text>
              <Hr className="my-6 border-slate-200" />
              <Text className="m-0 text-[13px] text-slate-500">
                If you didn&apos;t request this, you can safely ignore this email — someone probably
                typed your address by mistake.
              </Text>
            </Section>
            <Text className="mt-4 mb-0 text-center text-xs text-slate-400">{brand}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

MagicLink.PreviewProps = {
  url: "https://hub.tryalynx.com/api/auth/magic-link/verify?token=preview-token",
  brand: "Alynx",
  expiresInMinutes: 15,
} satisfies MagicLinkProps;

export default MagicLink;
