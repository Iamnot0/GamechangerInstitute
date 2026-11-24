import { initBotId } from "botid/client/core";

// Sign-in is the one form open to the public that sends email and guards the staff console,
// so requests from it carry proof that a browser, not a script, sent them.
initBotId({ protect: [{ path: "/sign-in*", method: "POST" }] });
