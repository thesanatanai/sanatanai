import { logger } from "@/utils/utils";
import { useAppStore } from "@/stores/appStore";
import jsCookie from "js-cookie";

async function manageSw() {
  if(!globalThis.navigator) return;
  
  if ("serviceWorker" in navigator) {
    const sw = navigator.serviceWorker;
    const isRegistered = await sw.getRegistration("/");
    if (isRegistered) {
      void isRegistered.update();
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

async function _manage() {
  void manageSw();
  if(!jsCookie.get("setupComplete")) return;
  await useAppStore.getState().loadProfile();
}

export default function manage() { void _manage() }