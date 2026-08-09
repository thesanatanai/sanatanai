/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export default function validateModifications(
  modifications: Record<string, unknown>,
) {
    const allowedModifications = [["title", String], ["timestamp", Number], ["messages", Array]];
    const validModifications = Object.keys(modifications).filter(
        (key) => {
           const reg = allowedModifications.find(v => v[0] == key);
           if(!reg) return
           try {
            const thing = modifications[key];
            const isSameType = thing instanceof (reg[1] as Function);
            if(!isSameType) return;
            return true
           } catch {}
        }
    );
    const final: Record<string, unknown> = {};
    validModifications.forEach(v => final[v] = modifications[v]);
    return final;
}