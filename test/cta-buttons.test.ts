import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, it, expect } from "vitest";
import Button from "../src/components/Button.astro";
import RequestFormButton from "../src/components/RequestFormButton.astro";
import DonateButton from "../src/components/DonateButton.astro";
import PartnershipButton from "../src/components/PartnershipButton.astro";

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
// today (site.ts has all three URLs set to `null`) — proving the actual site
// currently shows the correct disabled state, not just the generic mechanism.
describe("Configured CTAs currently render disabled (their URLs are null)", () => {
  it("RequestFormButton", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(RequestFormButton, { props: {} });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Request Form Coming Soon");
  });

  it("DonateButton", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(DonateButton, { props: {} });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Donations Not Yet Available");
  });

  it("PartnershipButton", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnershipButton, { props: {} });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Partnership Form Coming Soon");
  });
});
