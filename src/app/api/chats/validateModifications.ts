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
  modifications: Record<string, unknown>,
) {
  const final: Record<string, unknown> = {};
  for (const key of Object.keys(modifications)) {
    const validator = allowedModifications[key];
    if (!validator) continue;
    const value = modifications[key];
    if (!validator(value)) continue;
    final[key] = value;
  }
  return final;
}