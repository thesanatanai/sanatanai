import { logger } from "@/utils/utils";

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

export default function manage() {
  void manageSw();
}