import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, it, expect } from "vitest";
import Button from "../src/components/Button.astro";
import RequestFormButton from "../src/components/RequestFormButton.astro";
import DonateButton from "../src/components/DonateButton.astro";
import PartnershipButton from "../src/components/PartnershipButton.astro";
import { SERVICE_REQUEST_FORM_URL, PARTNERSHIP_FORM_URL } from "../src/config/site";

describe("Button (the mechanism behind every disabled-until-configured CTA)", () => {
  it("renders a disabled, non-link element when href is null", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
      props: { href: null, label: "Do The Thing", disabledLabel: "Coming Soon" },
    });
    expect(html).not.toContain("<a ");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Coming Soon");
  });

  it("renders a real external link once a URL is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
      props: { href: "https://forms.gle/example", label: "Do The Thing", external: true },
    });
    expect(html).toContain('href="https://forms.gle/example"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("aria-disabled");
  });
});

// These three exercise the real, currently-deployed components as configured
// today — proving the actual site shows the correct state (live link or
// disabled placeholder) per current site.ts values, not just the generic
// mechanism.
describe("Configured CTAs render as currently configured in site.ts", () => {
  it("RequestFormButton is a live link (SERVICE_REQUEST_FORM_URL is set)", async () => {
    expect(SERVICE_REQUEST_FORM_URL).not.toBeNull();
    const container = await AstroContainer.create();
    const html = await container.renderToString(RequestFormButton, { props: {} });
    expect(html).toContain(`href="${SERVICE_REQUEST_FORM_URL}"`);
    expect(html).not.toContain("aria-disabled");
  });

  it("DonateButton renders disabled (DONATION_URL is null)", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(DonateButton, { props: {} });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Donations Not Yet Available");
  });

  it("PartnershipButton is a live link (PARTNERSHIP_FORM_URL is set)", async () => {
    expect(PARTNERSHIP_FORM_URL).not.toBeNull();
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnershipButton, { props: {} });
    expect(html).toContain(`href="${PARTNERSHIP_FORM_URL}"`);
    expect(html).not.toContain("aria-disabled");
  });
});
