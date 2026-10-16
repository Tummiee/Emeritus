import { expect, it } from "vitest";
import { escapeHtml } from "./email-html";
import { isFutureLagosAppointment } from "./appointments";
it("escapes untrusted HTML in email text and attributes", () => {
  expect(escapeHtml('<img src="x">&')).toBe(
    "&lt;img src=&quot;x&quot;&gt;&amp;",
  );
});
it("rejects earlier appointments today in Lagos", () => {
  const now = Date.parse("2026-10-16T09:00:00Z");
  expect(isFutureLagosAppointment("2026-10-16", "09:30", now)).toBe(false);
  expect(isFutureLagosAppointment("2026-10-16", "10:30", now)).toBe(true);
});
