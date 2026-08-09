import { GetTemplateResponse, Resend } from "resend";

const resend = new Resend(process.env.RESEND_API);
const html = `<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta content="width=device-width,initial-scale=1" name="viewport"><meta name="x-apple-disable-message-reformatting"><title>Sanatan AI - Verify</title><style>@font-face{font-family:Poppins;font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDz8Z1xlFQ.woff2) format('woff2')}*{font-family:Poppins,Georgia,'Times New Roman',Times,serif}</style><body><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center"><tbody><tr dir="ltr" lang="en" style="margin:0;margin-left:12px;margin-right:12px"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="box-sizing:border-box;padding:8px;"><tbody><tr style="width:100%"><td style="padding-top:1rem;padding-bottom:1rem"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:10px;text-align:center;border-radius:24px;background-color:#16100b;background-image:radial-gradient(circle at 12% 14%,rgba(255,138,42,.2),transparent 31rem),radial-gradient(circle at 88% 12%,rgba(47,208,183,.16),transparent 28rem),linear-gradient(145deg,#090706 0,#16100b 46%,#080a0b 100%);border:1px solid rgba(255,229,190,.16)"><tbody><tr><td><h3 style="color:#f2c66d;font-size:.9rem;font-weight:700">PLEASE VERIFY YOUR EMAIL</h3><h1 style="color:#f1f1f1;margin:8px 0 12px;font-size:2.1rem;line-height:1">Sanatan AI</h1><p style="color:#bdb4a6;line-height:1.7;margin:0 auto 26px;max-width:430px">Hello curious!<br>We welcome you to Sanatan AI - The soul of intelligence.<br>This service is secure and hence require authentication<br>Your verification code is:</p><h1 style="color:#f2c66d;margin:8px 0 12px;font-size:2.1rem;line-height:1">{{{OTP}}}</h1><p style="color:#bdb4a6;line-height:1.7;margin:0 auto 26px;max-width:430px">Do not share this code with anyone.<br>It wil be expired within 10 minutes!</p></td></tr></tbody></table></td></tr></tbody></table></tr></tbody></table></body></html>`;

export async function _sendOTP(otp: number, to: string) {
  try {
    let template = await resend.templates.get("otp");
    if (!template.data)
      template = (await resend.templates.create({
        name: "otp",
        html,
        variables: [
          {
            key: "OTP",
            type: "string",
            fallbackValue: "No OTP",
          },
        ],
      })) as GetTemplateResponse;

    if (!template.data?.id) {
      const err = new Error("Missing ID from template");
      console.error(err);
      throw err;
    }

    await resend.emails.send({
      to,
      from: "Sanatan AI <verify@sanatan.run.place>",
      template: {
        id: template.data?.id as string,
        variables: {
          OTP: otp.toString(),
        },
      },
      subject: "Please Verify your email..",
    });

    return true;
  } catch (e) {
    console.log(otp);
    console.error(e);
  }
}

type MailOptions =
  | string
  | ((
      | {
          html: string;
          text?: undefined;
        }
      | { text: string; html?: undefined }
    ) & {
      subject?: string;
    });

export default async function sendMail(
  options: MailOptions,
  to: `${string}@${string}.${string}`,
) {
  try {
    const isTxt = typeof options == "string";
    let sendText = options as string;
    let sendHtml;
    let mailSubject = "Mail from Sanatan AI";
    if (!isTxt) {
      const { html, subject, text } = options;
      sendText = text as string;
      sendHtml = html;
      mailSubject = subject || "Mail from Sanatan AI";
    }
    await resend.emails.send({
      to,
      subject: mailSubject,
      html: sendHtml,
      text: sendText,
      react: undefined,
      from: "Sanatan AI <sanatan@sanatan.run.place>",
    });
    return true;
  } catch (e) {
    console.log(options);
    console.error(e);
  }
}
