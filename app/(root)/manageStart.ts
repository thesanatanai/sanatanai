/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger, login } from "@/utils/utils";
import jsCookie from "js-cookie";

async function manageSw() {
  if(!globalThis.navigator) return;
  
  if ("serviceWorker" in navigator) {
    const sw = navigator.serviceWorker;
    const isRegistered = await sw.getRegistration("/");
    if (isRegistered) {
      isRegistered.update();
    } else {
      sw.register("/sw.js")
        .then((reg) =>
          logger("[SW]: Registered successfully:", reg.scope),
        )
        .catch((err) =>
          logger("[SW]: Registration failed:", err),
        );
    }
  }
}

async function _manage(values: any) {
  manageSw();
  if(!jsCookie.get("setupComplete")) return;
  const { setFetched, name, email, picture, language } = values;
  await login({
    name, email, picture, prefferedLocale: language
  }, setFetched);
}

export default function manage(values: any) { _manage(values) }; 