import { Resend } from "resend";
import html from "./mail";

const resend = new Resend(process.env.RESEND_API);
const otpText = `Confirm your email address\nSanatan AI\nWe're almost there!
Thank you for signing up for Sanatan AI. To verify your account, we just need to confirm your email address.
{{{OTP}}}\nIf you didn't request this, ignore this email.`

export async function _sendOTP(otp: number, to: string) {
  try {
    const otpHTML = html.replace("{{{OTP}}}", otp.toString());
    const otpTextFinal = otpText.replace("{{{OTP}}}", otp.toString());

    const { error } = await resend.emails.send({
      to,
      from: "Sanatan AI <sanatan@shivam.click>",
      html: otpHTML,
      text: otpTextFinal,
      subject: "Verify Your Email",
    });

    if (error) {
      throw error;
    }

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
