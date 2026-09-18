/* eslint-disable @typescript-eslint/no-explicit-any */
type Validator = (value: unknown) => boolean;

const allowedModifications: Record<string, Validator> = {
  title: (v) => typeof v === "string" && v.trim().length > 0,
  timestamp: (v) => typeof v === "number" && Number.isFinite(v),
  messages: (v) => {
    if(!Array.isArray(v)) return false
    let isInvalid = false;
    v.forEach((message, i) => {
        if(!message.index) message.index = i;
        if(!message.role) message.role = "model";
        if(!Array.isArray(message.parts)) isInvalid = true;
    });
    return !isInvalid;
},
};

export default function validateModifications(
  modifications: { [K in string]: any },
) {
  const final: { [K in string]: any } = {};
  for (const key of Object.keys(modifications)) {
    const validator = allowedModifications[key];
    if (!validator) continue;
    const value = modifications[key];
    if (!validator(value)) continue;
    final[key] = value;
  }
  const allText = final.messages?.map((message: any) => message?.parts?.map((part: any) => part?.text).join("")).join("");
  if(!allText && final.messages) {
    final.messages = [];
  }
  return final;
}