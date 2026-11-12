import { previewPath } from "./preview-path";
import { expect, test } from "@playwright/test";

test("selects periods with arrow keys and a light lens", async ({ page }) => {
  await page.goto("/design-system");
  const today = page.getByRole("radio", { name: "Hoy", exact: true });
  await today.focus();
  await page.keyboard.down("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Mañana", exact: true }),
  ).toBeChecked();
  await page.keyboard.up("ArrowRight");
  await expect(page.getByText("Luis García", { exact: true })).toBeVisible();
  const lens = page
    .locator('[data-slot="segmented-control"]')
    .last()
    .locator(".glass-thumb");
  await expect(lens).toBeVisible();
  const fill = await lens.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(fill).not.toBe("rgb(24, 24, 27)");
});

test("validates typed dates and keeps the inline month synchronized", async ({
  page,
}) => {
  await page.goto("/design-system");
  const trigger = page.getByRole("button", {
    name: /^Fecha de disponibilidad:/,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Fecha de disponibilidad",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Escribir fecha").fill("31/02/2026");
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/fecha válida/);
  await dialog.getByLabel("Escribir fecha").fill("05/11/2026");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toContainText("5 nov 2026");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#picker-demo")).toContainText("noviembre 2026");
  await page
    .getByRole("combobox", { name: "Horario de consulta", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Mañana", exact: true })
    .getByRole("option", { name: "09:45", exact: true })
    .click();
  await expect(
    page.getByText("5 de noviembre · 09:45", { exact: true }),
  ).toBeVisible();
});

test("uses a mobile sheet without overflow at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const trigger = page.getByRole("button", {
    name: /^Fecha de disponibilidad:/,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Fecha de disponibilidad",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByLabel("Escribir fecha").fill("02/11/2026");
  await dialog.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(trigger).toContainText("2 nov 2026");
  await expect(trigger).toBeFocused();
  await page.screenshot({
    path: previewPath("wave1-mobile-light.png"),
    fullPage: true,
  });
});

test("persists theme across reloads and follows the system preference", async ({
  page,
}) => {
  await page.goto("/design-system");
  await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Oscuro", exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("radio", { name: "Sistema", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: /^Fecha de disponibilidad:/ }).click();
  const panel = page.getByRole("dialog", {
    name: "Fecha de disponibilidad",
    exact: true,
  });
  expect(
    await panel.evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(250, 250, 250)");
});

test("keeps landing calls to action light and semantically navigable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Comenzar gratis", exact: true });
  await expect(cta).toHaveAttribute("href", "/register");
  await expect(cta).toHaveClass(/glass-bubble/);
  expect(await cta.evaluate((element) => getComputedStyle(element).color)).toBe(
    "rgb(24, 24, 27)",
  );
  expect(await page.locator("a button").count()).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: previewPath("wave1-landing.png"),
    fullPage: true,
  });
});

test("uses distinct blur presets with legible text on both themes", async ({
  page,
}) => {
  await page.goto("/design-system");
  for (const theme of ["Claro", "Oscuro"]) {
    await page.getByRole("radio", { name: theme, exact: true }).click();
    const plain = page
      .locator('[data-material-sample="plain"] .glass-bubble')
      .first();
    const content = page.locator(
      '[data-material-sample="content"] [data-slot="glass-surface"]',
    );
    const media = page.locator(
      '[data-material-sample="media"] [data-slot="glass-surface"]',
    );
    expect(
      await plain.evaluate(
        (element) => getComputedStyle(element).backdropFilter,
      ),
    ).toBe("blur(12px)");
    expect(
      await content.evaluate(
        (element) => getComputedStyle(element).backdropFilter,
      ),
    ).toBe("blur(24px)");
    expect(
      await media.evaluate(
        (element) => getComputedStyle(element).backdropFilter,
      ),
    ).toBe("blur(30px)");
    // Worst-case black/white backdrop, including the brightest gloss on dark glass.
    for (const element of [plain, content, media]) {
      const contrast = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        const color = (value: string) => {
          // Production CSS may serialize custom colors as hex. Resolve them
          // through the browser before applying the same alpha/contrast math.
          const probe = document.createElement("span");
          probe.style.color = value;
          node.appendChild(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return (resolved.match(/[\d.]+/g) ?? []).map(Number);
        };
        const fg = color(style.color);
        const fill = color(style.getPropertyValue("--material-fill"));
        const gloss = color(style.getPropertyValue("--glass-gloss"));
        const luminance = (rgb: number[]) =>
          rgb.reduce((sum, channel, index) => {
            const v = channel / 255;
            return (
              sum +
              (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722) *
                (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
            );
          }, 0);
        return Math.min(
          ...[0, 255].map((backdrop) => {
            const base = fill
              .slice(0, 3)
              .map(
                (channel) =>
                  channel * (fill[3] ?? 1) + backdrop * (1 - (fill[3] ?? 1)),
              );
            const lit = base.map(
              (channel, index) =>
                channel * (1 - (gloss[3] ?? 1)) +
                (gloss[index] ?? 0) * (gloss[3] ?? 1),
            );
            const a = luminance(fg),
              b = luminance(lit);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          }),
        );
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("supports searchable selection and birth dates without paging through decades", async ({
  page,
}) => {
  await page.goto("/design-system");
  await page
    .getByRole("combobox", { name: "Profesional de muestra", exact: true })
    .click();
  await page
    .getByRole("combobox", {
      name: "Buscar profesional de muestra",
      exact: true,
    })
    .fill("cardio");
  await page.getByRole("option", { name: /Diego Navarro/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Profesional de muestra", exact: true }),
  ).toContainText("Diego Navarro");
  await page
    .getByRole("button", { name: /^Fecha de nacimiento de muestra:/ })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Fecha de nacimiento de muestra",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Año", exact: true })
    .selectOption("1990");
  await dialog
    .getByRole("combobox", { name: "Mes", exact: true })
    .selectOption("5");
  await dialog.getByRole("button", { name: /20 de junio de 1990/ }).click();
  await expect(
    page.getByRole("button", { name: /^Fecha de nacimiento de muestra:/ }),
  ).toContainText("20 jun 1990");
});
