import { expect, test } from "@playwright/test";

test("time picker uses a list on desktop and supports keyboard selection", async ({
  page,
}) => {
  await page.goto("/design-system");
  const trigger = page.getByRole("combobox", {
    name: "Horario de consulta",
    exact: true,
  });
  await expect(trigger).toContainText("10:30");
  await trigger.click();
  await expect(page.getByRole("option")).toHaveCount(9);
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("option", { name: "09:00", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "09:45", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("09:45");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("listbox")).not.toBeVisible();
});

test("mobile hours remain a draft until confirmation and restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/design-system");
  const trigger = page.getByRole("button", {
    name: "Horario de consulta",
    exact: true,
  });
  await trigger.click();
  const sheet = page.getByRole("dialog", {
    name: "Horarios disponibles",
    exact: true,
  });
  await expect(
    sheet.getByRole("button", { name: /Elegir horario/ }),
  ).toBeInViewport({ ratio: 1 });
  await sheet.getByRole("radio", { name: "16:45, Tarde", exact: true }).click();
  await sheet.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(trigger).toContainText("10:30");
  await trigger.click();
  await sheet.getByRole("radio", { name: "16:45, Tarde", exact: true }).click();
  await sheet.getByRole("button", { name: /Elegir horario/ }).click();
  await expect(trigger).toContainText("16:45");
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sidebar retains selection, collapse preference, workspace and section search", async ({
  page,
}) => {
  await page.goto("/design-system/shell");
  const navigation = page.getByRole("navigation", {
    name: "Navegación principal",
    exact: true,
  });
  await expect(
    navigation.getByRole("link", { name: "Agenda", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Colapsar barra lateral", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir barra lateral", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Expandir barra lateral", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /Cambiar consultorio, actual: Consultorio Reforma/,
    })
    .click();
  await page.getByRole("menuitem", { name: /Consultorio Norte/ }).click();
  await expect(
    page.getByRole("button", {
      name: /Cambiar consultorio, actual: Consultorio Norte/,
    }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", {
    name: "Buscar en Dopilot",
    exact: true,
  });
  await dialog
    .getByRole("textbox", { name: "Buscar una sección", exact: true })
    .fill("Horarios");
  await expect(dialog.getByRole("link", { name: /Horarios/ })).toHaveAttribute(
    "href",
    "/dashboard/schedule",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("mobile shell exposes patient destinations, theme and search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/shell");
  await page.getByRole("radio", { name: "Paciente", exact: true }).click();
  const nav = page.getByRole("navigation", {
    name: "Navegación móvil",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Citas", exact: true }),
  ).toHaveAttribute("href", "/patient/appointments");
  await nav.getByRole("button", { name: "Más", exact: true }).click();
  const more = page.getByRole("dialog", { name: "Más secciones", exact: true });
  await expect(
    more.getByRole("link", { name: "Mi perfil", exact: true }),
  ).toHaveAttribute("href", "/patient/profile");
  await more.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Buscar sección", exact: true })
    .click();
  const search = page.getByRole("dialog", {
    name: "Buscar en Dopilot",
    exact: true,
  });
  await search
    .getByRole("textbox", { name: "Buscar una sección", exact: true })
    .fill("no existe");
  await expect(search).toContainText("No encontramos una sección");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("login preserves credentials on rejection, password visibility and booking context", async ({
  page,
}) => {
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/providers")
      ? {
          credentials: {
            id: "credentials",
            name: "Credentials",
            type: "credentials",
            signinUrl: "http://localhost:3000/api/auth/signin/credentials",
            callbackUrl: "http://localhost:3000/api/auth/callback/credentials",
          },
        }
      : path.endsWith("/csrf")
        ? { csrfToken: "test-csrf" }
        : path.includes("/callback/")
          ? { url: "http://localhost:3000/login?error=CredentialsSignin" }
          : null;
    await route.fulfill({ json });
  });
  const destination = "/book-appointment/demo?service=follow-up";
  await page.goto(
    `/login?${new URLSearchParams({ callbackUrl: destination })}`,
  );
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("prueba@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("C0nsulta!2026");
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.locator("#login-error")).toContainText(
    "El correo o la contraseña no son correctos",
  );
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toHaveValue("prueba@example.test");
  await expect(
    page.getByRole("link", { name: "Crear cuenta", exact: true }),
  ).toHaveAttribute(
    "href",
    `/register?${new URLSearchParams({ callbackUrl: destination })}`,
  );
});

test("registration keeps role drafts, associates validation and handles mocked account creation", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/trpc/auth.register**", async (route) => {
    const body = route.request().postDataJSON() as Record<
      string,
      { json: Record<string, unknown> }
    >;
    submitted = body["0"]?.json;
    await route.fulfill({
      json: [
        {
          result: {
            data: {
              json: {
                result: { id: "demo-patient" },
                error: null,
                status: 201,
                message: "Cuenta creada",
              },
            },
          },
        },
      ],
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/register");
  await page
    .getByLabel("Nombre completo", { exact: true })
    .fill("Doctora de Prueba");
  await page.getByRole("radio", { name: "Paciente", exact: true }).click();
  await expect(page.getByLabel("Nombre completo", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Nombre completo", { exact: true })
    .fill("Paciente de Prueba");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("correo-invalido");
  await page.getByLabel("Teléfono", { exact: true }).focus();
  await expect(
    page.getByLabel("Correo electrónico", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("prueba@example.test");
  await page.getByLabel("Teléfono", { exact: true }).fill("5512345678");
  await page.getByLabel("Contraseña", { exact: true }).fill("C0nsulta!2026");
  await page.getByRole("button", { name: /Crear cuenta de paciente/ }).click();
  await expect(page.getByRole("status")).toContainText("Tu cuenta está lista");
  expect(submitted?.role).toBe("PATIENT");
  expect(submitted).not.toHaveProperty("license");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
