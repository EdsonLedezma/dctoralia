import { previewPath } from "./preview-path";
import { expect, test } from "@playwright/test";

test("presents real WebGPU frames and releases the device on preference change", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (typeof GPUAdapter === "undefined") return;
    const requestDevice = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (descriptor) {
      const device = await requestDevice.call(this, descriptor);
      sessionStorage.setItem(
        "glass-created",
        String(Number(sessionStorage.getItem("glass-created")) + 1),
      );
      const destroy = device.destroy.bind(device);
      device.destroy = () => {
        sessionStorage.setItem(
          "glass-destroyed",
          String(Number(sessionStorage.getItem("glass-destroyed")) + 1),
        );
        destroy();
      };
      return device;
    };
  });
  await page.goto("/design-system");
  const artwork = page.locator("[data-render-state]");
  await expect(artwork).toHaveAttribute("data-render-state", "ready");
  await expect
    .poll(() =>
      page.evaluate(() => Number(sessionStorage.getItem("glass-created"))),
    )
    .toBeGreaterThan(0);
  await artwork.screenshot({ path: previewPath("liquid-glass-gpu.png") });
  await page.screenshot({
    path: previewPath("design-desktop.png"),
    fullPage: true,
  });
  // Force the media preference that must tear down the running GPU scene.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(artwork).toHaveAttribute("data-render-state", "fallback");
  await expect
    .poll(() =>
      page.evaluate(() => Number(sessionStorage.getItem("glass-destroyed"))),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(artwork).toHaveAttribute("data-render-state", "ready");
  await page.setViewportSize({ width: 390, height: 600 });
  await page
    .getByRole("heading", { name: "Claridad en cada detalle." })
    .scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-render-state", "fallback");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Number(sessionStorage.getItem("glass-created")) -
          Number(sessionStorage.getItem("glass-destroyed")),
      ),
    )
    .toBe(0);
  expect(errors).toEqual([]);
});

test("works without WebGPU, including keyboard dialog and confirmation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/design-system");
  await expect(page.locator("[data-render-state]")).toHaveAttribute(
    "data-render-state",
    "fallback",
  );
  await page.getByRole("radio", { name: "Mañana", exact: true }).click();
  await expect(page.getByText("Luis García", { exact: true })).toBeVisible();
  await expect(page.getByText("María López", { exact: true })).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Nueva cita" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Nombre del paciente")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel("Nombre del paciente").fill("Paciente de demostración");
  await page.getByRole("button", { name: /^Fecha de la consulta:/ }).click();
  await page.getByLabel("Escribir fecha").fill("02/11/2026");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.getByRole("button", { name: "Probar confirmación" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Demostración completada" }),
  ).toHaveText("Demostración completada. No se guardaron datos.");
});

test("keeps the mobile layout within the viewport with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system");
  await expect(page.locator("[data-render-state]")).toHaveAttribute(
    "data-render-state",
    "fallback",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByLabel("Nombre del paciente")
      .evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe("16px");
  await page.getByLabel("Nombre del paciente").fill("Paciente móvil");
  const dateTrigger = page.getByRole("button", {
    name: /^Fecha de la consulta:/,
  });
  await dateTrigger.click();
  const picker = page.getByRole("dialog", {
    name: "Fecha de la consulta",
    exact: true,
  });
  await picker.getByLabel("Escribir fecha").fill("02/11/2026");
  await picker.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await expect(page.getByLabel("Nombre del paciente")).toHaveValue(
    "Paciente móvil",
  );
  await expect(dateTrigger).toBeFocused();
  await expect(dateTrigger).toContainText("2 nov 2026");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: previewPath("design-mobile.png"),
    fullPage: true,
  });
});

test("keeps dark dialogs and high contrast materials legible", async ({
  page,
}) => {
  await page.goto("/design-system");
  await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await page.getByRole("button", { name: "Nueva cita" }).click();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe("rgb(28, 28, 31)");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ contrast: "more" });
  await expect(page.locator("[data-render-state]")).toHaveAttribute(
    "data-render-state",
    "fallback",
  );
  const material = page.locator('[data-slot="glass-surface"]').first();
  expect(
    await material.evaluate(
      (element) => getComputedStyle(element).backdropFilter,
    ),
  ).toBe("none");
  await page.screenshot({
    path: previewPath("design-dark.png"),
    fullPage: true,
  });
});
