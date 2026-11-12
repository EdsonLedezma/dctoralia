import { expect, test } from "@playwright/test";
import { previewPath } from "./preview-path";

test("Dopilot official SVGs follow manual theme and the hero renders and releases WebGPU", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (typeof GPUAdapter === "undefined") return;
    const request = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (descriptor) {
      const device = await request.call(this, descriptor);
      sessionStorage.setItem(
        "brand-created",
        String(Number(sessionStorage.getItem("brand-created")) + 1),
      );
      const destroy = device.destroy.bind(device);
      device.destroy = () => {
        sessionStorage.setItem(
          "brand-destroyed",
          String(Number(sessionStorage.getItem("brand-destroyed")) + 1),
        );
        destroy();
      };
      return device;
    };
  });
  await page.goto("/");
  const artwork = page.locator("[data-brand-render-state]");
  await expect(artwork).toHaveAttribute("data-brand-render-state", "ready");
  await expect(artwork.locator("canvas")).toHaveAttribute(
    "data-gpu-frame",
    "1",
  );
  await expect(page.locator("[data-render-state]")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /TypeGPU Liquid Glass/ }),
  ).toHaveCount(0);
  const logo = page.locator('header [data-brand-asset="/dopilot-logo.svg"]');
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(24, 24, 27)");
  await expect(
    page.getByRole("button", { name: "Cambiar apariencia", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator("footer").getByRole("button")).toHaveCount(0);
  await page.screenshot({
    path: previewPath("dopilot-landing-light.png"),
    animations: "disabled",
  });
  const devicesBeforeThemeChange = await page.evaluate(() =>
    Number(sessionStorage.getItem("brand-created")),
  );
  await page
    .getByRole("button", { name: "Cambiar apariencia", exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Oscuro", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect
    .poll(() =>
      page.evaluate(() => Number(sessionStorage.getItem("brand-created"))),
    )
    .toBeGreaterThan(devicesBeforeThemeChange);
  await expect(artwork).toHaveAttribute("data-brand-render-state", "ready");
  expect(
    await logo.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(250, 250, 250)");
  await page.screenshot({
    path: previewPath("dopilot-landing-dark.png"),
    animations: "disabled",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(artwork).toHaveAttribute("data-brand-render-state", "fallback");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Number(sessionStorage.getItem("brand-created")) -
          Number(sessionStorage.getItem("brand-destroyed")),
      ),
    )
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(artwork).toHaveAttribute("data-brand-render-state", "ready");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-brand-render-state", "fallback");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Number(sessionStorage.getItem("brand-created")) -
          Number(sessionStorage.getItem("brand-destroyed")),
      ),
    )
    .toBe(0);
  expect(errors).toEqual([]);
});

test("Dopilot landing and official logos stay usable on mobile without GPU", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      get: () => undefined,
    }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("[data-brand-render-state]")).toHaveAttribute(
    "data-brand-render-state",
    "fallback",
  );
  await expect(
    page.getByRole("link", { name: "Comenzar gratis", exact: true }),
  ).toHaveAttribute("href", "/register");
  await expect(
    page.locator("header").getByRole("img", { name: "Dopilot", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: previewPath("dopilot-landing-mobile.png"),
    animations: "disabled",
  });
  await page.goto("/login");
  await expect(
    page.locator('[data-brand-asset="/dopilot-logo.svg"]'),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Dopilot/);
});
