"use server";
import sendEmail from "@/app/api/utils/sendMail";

export default async function sendErr(e: Error) {
  "use server";
  await sendEmail({
    subject: "Error Caused",
    text: `Error caused with a client:
        ${e.stack || e.message}`,
  }, "shivam8299.sharma@gmail.com");
}
