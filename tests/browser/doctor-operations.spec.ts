import { previewPath } from "./preview-path";
import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    recordOperation: (path: string) => Promise<void>;
  }
}

async function openPreview(page: Page, view: string, scenario = "ready") {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/")) apiRequests.push(request.url());
  });
  const operationRequests: string[] = [];
  await page.exposeFunction("recordOperation", (path: string) => {
    operationRequests.push(path);
  });
  await page.addInitScript(() => {
    window.addEventListener("operations-preview-request", (event) => {
      if (event instanceof CustomEvent) {
        const detail: unknown = event.detail;
        if (
          detail &&
          typeof detail === "object" &&
          "path" in detail &&
          typeof detail.path === "string"
        )
          void window.recordOperation(detail.path);
      }
    });
  });
  await page.goto(
    `/design-system/operations?view=${view}&scenario=${scenario}`,
  );
  return { apiRequests, operationRequests };
}
async function screenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: previewPath(`operations-${name}.png`),
    fullPage,
    animations: "disabled",
  });
}
async function date(page: Page, label: string, value: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  await page.getByLabel("Escribir fecha").fill(value);
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
}
async function time(page: Page, value: string) {
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page
      .getByRole("button", { name: "Horario de consulta", exact: true })
      .click();
    const sheet = page.getByRole("dialog", {
      name: "Horarios disponibles",
      exact: true,
    });
    await sheet.getByRole("radio", { name: new RegExp(`^${value}`) }).click();
    await sheet.getByRole("button", { name: /Elegir horario/ }).click();
  } else {
    await page
      .getByRole("combobox", { name: "Horario de consulta", exact: true })
      .click();
    await page.getByRole("option", { name: value, exact: true }).click();
  }
}

test("doctor overview prioritizes today's appointments and follows both themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { apiRequests: api } = await openPreview(page, "overview");
  await expect(
    page.getByRole("heading", { name: "Agenda de hoy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("María López", { exact: true }).first(),
  ).toBeVisible();
  const today = await page
    .getByRole("heading", { name: "Agenda de hoy", exact: true })
    .boundingBox();
  const analysis = await page
    .getByRole("heading", { name: "Actividad de la consulta", exact: true })
    .boundingBox();
  expect(today!.y).toBeLessThan(analysis!.y);
  await screenshot(page, "overview-light");
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });
  await screenshot(page, "overview-dark");
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
});

test("agenda filters, keyboard view selector and reschedule conflict preserve context", async ({
  page,
}) => {
  await openPreview(page, "agenda", "conflict");
  await expect(page.getByText("María López", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Estado de citas", exact: true })
    .click();
  await page.getByRole("option", { name: "Pendientes", exact: true }).click();
  await expect(
    page.getByText("María López", { exact: true }),
  ).not.toBeVisible();
  await expect(page.getByText("Andrés García", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await page.getByRole("radio", { name: "Día", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Semana", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("radio", { name: "Semana", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await screenshot(page, "agenda-week");
  await page.getByRole("radio", { name: "Día", exact: true }).click();
  await page
    .getByRole("button", { name: "Acciones para María López", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Reprogramar", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Reprogramar cita",
    exact: true,
  });
  await time(page, "09:00");
  await dialog
    .getByRole("button", { name: "Guardar horario", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("ocupado");
  await expect(
    dialog.getByRole("button", { name: "Guardar horario", exact: true }),
  ).toBeDisabled();
  await time(page, "10:30");
  await screenshot(page, "reschedule");
  await dialog
    .getByRole("button", { name: "Guardar horario", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: "María López" }),
  ).toContainText("10:30");
});

test("mobile patient directory searches accents, recovers errors and fits the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { apiRequests: api } = await openPreview(page, "patients", "error");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Reintentar pacientes" }).click();
  await page.getByRole("textbox", { name: "Buscar pacientes" }).fill("maria");
  await expect(page.getByRole("link", { name: /María López/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Andrés García/ }),
  ).not.toBeVisible();
  await screenshot(page, "patients-mobile", false);
  await page
    .getByRole("textbox", { name: "Buscar pacientes" })
    .fill("sin-coincidencia");
  await expect(
    page.getByRole("heading", { name: "Sin resultados para esta búsqueda" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.getByRole("link", { name: /Andrés García/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(api).toEqual([]);
});

test("new appointment uses nested shared pickers and recovers a conflicting slot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { operationRequests } = await openPreview(
    page,
    "new-appointment",
    "conflict",
  );
  const dialog = page.getByRole("dialog", {
    name: "Agendar paciente",
    exact: true,
  });
  await page.getByRole("combobox", { name: "Paciente", exact: true }).click();
  await page.getByRole("option", { name: /María López/ }).click();
  await page
    .getByRole("combobox", { name: "Tipo de consulta", exact: true })
    .click();
  await page.getByRole("option", { name: /Consulta general/ }).click();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await date(
    page,
    "Fecha de la cita",
    new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Mexico_City",
    }).format(tomorrow),
  );
  await time(page, "09:00");
  await screenshot(page, "new-appointment-mobile", false);
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("combobox", { name: /Motivo/ }).click();
  await page.getByRole("option", { name: "Control", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirmar cita", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("ocupado");
  await time(page, "10:30");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("combobox", { name: /Motivo/ })).toContainText(
    "Control",
  );
  expect(
    operationRequests.filter((path) => path === "appointments.create"),
  ).toHaveLength(1);
  await expect(
    dialog.getByRole("button", { name: "Confirmar cita", exact: true }),
  ).toBeEnabled();
});

test("new patient retries the failed profile without creating another account", async ({
  page,
}) => {
  const { apiRequests: api, operationRequests } = await openPreview(
    page,
    "new-patient",
    "profile-error",
  );
  await page.getByLabel("Nombre *", { exact: true }).fill("Paciente");
  await page.getByLabel("Apellidos *", { exact: true }).fill("De muestra");
  await page
    .getByLabel("Correo electrónico *", { exact: true })
    .fill("paciente@example.com");
  await page
    .getByLabel("Contraseña inicial *", { exact: true })
    .fill("Temporal-demo-283!");
  await date(page, "Fecha de nacimiento", "12/05/1990");
  await page.getByLabel("Teléfono *", { exact: true }).fill("5550000000");
  await screenshot(page, "new-patient");
  await page
    .getByRole("button", { name: "Guardar paciente", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Reintenta",
  );
  await expect(
    page.getByLabel("Correo electrónico *", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Contraseña inicial *", { exact: true }),
  ).not.toBeVisible();
  expect(
    operationRequests.filter((name) => name === "users.create"),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Completar registro", exact: true })
    .click();
  await expect
    .poll(
      () =>
        operationRequests.filter((name) => name === "patients.create").length,
    )
    .toBe(2);
  expect(
    operationRequests.filter((name) => name === "users.create"),
  ).toHaveLength(1);
  expect(api).toEqual([]);
});

test("anonymous doctor routes stay protected", async ({ request }) => {
  for (const path of [
    "/dashboard",
    "/dashboard/appointments",
    "/dashboard/appointments/new",
    "/dashboard/patients",
    "/dashboard/patients/new",
    "/patient/dashboard",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/login");
  }
});

test("mobile patient form keeps contact fields and save action clear of navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { apiRequests } = await openPreview(page, "new-patient");
  const address = page.getByLabel("Domicilio (opcional)", { exact: true });
  await address.focus();
  await expect(address).toBeInViewport({ ratio: 1 });
  await address.fill("Domicilio de muestra");
  const save = page.getByRole("button", {
    name: "Guardar paciente",
    exact: true,
  });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  const inputBox = await address.boundingBox();
  const saveBox = await save.boundingBox();
  expect(inputBox!.y + inputBox!.height).toBeLessThan(saveBox!.y);
  const nav = page.getByRole("navigation", {
    name: "Navegación móvil",
    exact: true,
  });
  await expect(nav).toBeVisible();
  const navBox = await nav.boundingBox();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(navBox!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await screenshot(page, "new-patient-mobile", false);
  expect(apiRequests).toEqual([]);
});

test("patient dashboard drops the promotional banner and uses neutral glass cards", async ({
  page,
}) => {
  const { apiRequests } = await openPreview(page, "patient-overview");
  await expect(
    page.getByRole("heading", { name: "Próximas citas", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tu cuidado comienza aquí.", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText("Tu próxima consulta está en camino.", { exact: true }),
  ).not.toBeVisible();
  await expect(page.locator("[data-patient-card]")).toHaveCount(5);
  await expect(page.locator("[data-patient-card]").first()).toHaveClass(
    /glass-panel/,
  );
  await expect(page.locator("main a button")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Agendar consulta", exact: true }),
  ).toHaveAttribute("href", "/patient/doctors");
  const color = await page
    .locator("[data-patient-card]")
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  expect(Math.max(...channels) - Math.min(...channels)).toBeLessThanOrEqual(4);
  await screenshot(page, "patient-overview-light");
  await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await screenshot(page, "patient-overview-dark");
  await page.getByRole("radio", { name: "Claro", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Próximas citas", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await screenshot(page, "patient-overview-mobile", false);
  expect(apiRequests).toEqual([]);
});

test("patient dashboard separates empty and recoverable error states", async ({
  page,
}) => {
  await openPreview(page, "patient-overview", "error");
  const cards = page.locator("[data-patient-card]");
  await expect(cards.first().getByRole("alert")).toBeVisible();
  await cards
    .first()
    .getByRole("button", { name: "Reintentar", exact: true })
    .click();
  await expect(
    cards
      .first()
      .getByRole("link", { name: /Dra. Elena Rivera/ })
      .first(),
  ).toBeVisible();
  await page.goto(
    "/design-system/operations?view=patient-overview&scenario=empty",
  );
  await expect(
    page.getByText("Aún no tienes citas programadas.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tu cuidado comienza aquí.", { exact: true }),
  ).not.toBeVisible();
});
