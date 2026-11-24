import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetStores } from "../helpers/stores";

// Testing Library only auto-cleans when test globals are enabled; they are not.
// The stores are shared by every test in a file, so they are reset as well.
afterEach(() => {
  cleanup();
  resetStores();
});
