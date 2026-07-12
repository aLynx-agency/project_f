import { Resend } from "resend";

import { env } from "@/env";

let _resend: Resend | undefined;

export const resend = {
  get emails() {
    _resend ??= new Resend(env.RESEND_API_KEY);
    return _resend.emails;
  },
};
