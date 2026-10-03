import { GetTemplateResponse, Resend } from "resend";

const resend = new Resend(process.env.RESEND_API);
const html = `<!DOCTYPE html><html lang="en"><meta charset="utf-8" /><meta content="width=device-width,initial-scale=1" name="viewport" /><meta name="x-apple-disable-message-reformatting" /><title>Sanatan AI - Verify </title><body><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" ><tbody><tr style="width: 100%"><td style="padding-top: 1rem; padding-bottom: 1rem"><tbody style=" font-family: system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Open Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; " ><tr><td align="center"><h3 style=" color: #f2c66d; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; " >Please Verify Your Email </h3><h1 style=" color: #e79d2c; margin: 8px 0 12px; font-size: 2.1rem; line-height: 1; " >Sanatan AI </h1><p style=" color: #777; line-height: 1.7; margin: 0 auto 26px; max-width: 430px; " >Hello, you are welcomed to Sanatan AI.<br />We have a verification code for you. Do not share this code with anyone. It will be expired within 10 minutes.<br />Your verification code is: </p><h1 style=" color: #f2c66d; margin: 8px 0 12px; font-size: 2.1rem; line-height: 1; " >{{{OTP}}} </h1><p style=" color: #777; line-height: 1.7; margin: 0 auto 26px; max-width: 430px; " >If you did not requested, please ignore this message </p></td></tr></tbody></td></tr></tbody></table></body></html>`;

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
      from: "Sanatan AI <sanatan@shivam.click>",
      template: {
        id: template.data?.id as string,
        variables: {
          OTP: otp.toString(),
        },
      },
      subject: "Verify Your Email",
    });

    return true;
  } catch (e) {
    console.error(e);
    throw e;
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
    let sendText = options as string; // If options are string, they are saved here
    let sendHtml;
    let mailSubject = "Mail from Sanatan AI";
    if (!isTxt) {
      const { html, subject, text } = options;
      sendText = text as string; // If options has text, set it or it is set to undefined
      sendHtml = html;
      mailSubject = subject || "Mail from Sanatan AI";
    }
    await resend.emails.send({
      to,
      subject: mailSubject,
      html: sendHtml,
      text: sendText,
      react: undefined,
      from: "Sanatan AI <sanatan@shivam.click>",
    });
    return true;
  } catch (e) {
    console.log(options);
    console.error(e);
  }
}
