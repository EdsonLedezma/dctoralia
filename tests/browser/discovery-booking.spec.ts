import { expect, test, type Page } from "@playwright/test";
import superjson from "superjson";
import {
  availableDay,
  calendarDay,
  doctorId,
  doctorProfile,
  service,
  serviceId,
} from "../fixtures/discovery";

type MockOptions = {
  patient?: boolean;
  conflict?: boolean;
  empty?: boolean;
  serviceError?: boolean;
  missingDoctor?: boolean;
};
async function mockBooking(page: Page, options: MockOptions = {}) {
  const mutations: Array<Record<string, unknown>> = [];
  const endpoints: string[] = [];
  let serviceCalls = 0;
  await page.route("**/api/auth/session**", (route) =>
    route.fulfill({
      json: options.patient
        ? {
            user: {
              id: "test-patient-user",
              name: "Paciente de prueba",
              role: "PATIENT",
            },
            expires: "2099-01-01T00:00:00Z",
          }
        : null,
    }),
  );
  await page.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const names = decodeURIComponent(
      url.pathname.split("/api/trpc/")[1] ?? "",
    ).split(",");
    const data = names.map((name) => {
      endpoints.push(name);
      const ok = (result: unknown) => ({
        result: {
          data: superjson.serialize({
            result,
            error: null,
            status: 200,
            message: "Datos de prueba",
          }),
        },
      });
      const fail = (message: string, status: number) => ({
        result: {
          data: superjson.serialize({
            result: null,
            error: "MOCK_ERROR",
            status,
            message,
          }),
        },
      });
      if (name === "doctor.getById")
        return options.missingDoctor
          ? fail("Doctor no encontrado", 404)
          : ok(doctorProfile);
      if (name === "services.publicGetByDoctor") {
        serviceCalls++;
        return options.serviceError && serviceCalls === 1
          ? fail("No pudimos cargar los servicios", 500)
          : ok([{ ...service, doctorId, clinicId: "test-clinic" }]);
      }
      if (name === "schedule.getAvailableSlots")
        return ok(
          options.empty
            ? []
            : [
                { date: availableDay, time: "09:00" },
                { date: availableDay, time: "10:30" },
                { date: calendarDay(2), time: "11:15" },
              ].filter(
                (slot) =>
                  !(
                    options.conflict &&
                    mutations.length > 0 &&
                    slot.time === "09:00"
                  ),
              ),
        );
      if (name === "auth.getProfile")
        return ok({ patient: { id: "test-patient" } });
      if (name === "notifications.unreadCount") return ok(0);
      if (name === "workspace.listMine")
        return ok({ workspaces: [], activeClinicId: null });
      if (name === "appointments.create") {
        const body = route.request().postDataJSON() as Record<
          string,
          ReturnType<typeof superjson.serialize>
        >;
        mutations.push(
          superjson.deserialize<Record<string, unknown>>(body["0"]!),
        );
        return options.conflict && mutations.length === 1
          ? fail("El horario ya está ocupado. Elige otro horario.", 409)
          : ok({ id: "test-appointment", status: "PENDING" });
      }
      throw new Error(`Unexpected endpoint in UI fixture: ${name}`);
    });
    await route.fulfill({ json: data });
  });
  return { mutations, endpoints };
}
const typedDate = (date: string) => date.split("-").reverse().join("/");
async function capture(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `test-results/discovery-${name}.png`,
    fullPage,
    animations: "disabled",
  });
}
async function chooseTime(page: Page, time: string) {
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page
      .getByRole("button", { name: "Horario de consulta", exact: true })
      .click();
    const sheet = page.getByRole("dialog", {
      name: "Horarios disponibles",
      exact: true,
    });
    await sheet.getByRole("radio", { name: new RegExp(`^${time},`) }).click();
    await sheet.getByRole("button", { name: /Elegir horario/ }).click();
  } else {
    await page
      .getByRole("combobox", { name: "Horario de consulta", exact: true })
      .click();
    await page.getByRole("option", { name: time, exact: true }).click();
  }
}

test("directory retains filters on reload and carries them into profile links", async ({
  page,
}) => {
  await page.goto("/design-system/discovery");
  await expect(page.locator("[data-doctor-card]")).toHaveCount(3);
  await capture(page, "directory-light");
  await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await capture(page, "directory-dark");
  await page.getByRole("radio", { name: "Claro", exact: true }).click();
  const search = page.getByRole("textbox", {
    name: "Buscar doctor, especialidad o ciudad",
    exact: true,
  });
  await search.fill("cardiologia");
  await expect(page.locator("[data-doctor-card]")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Filtrar por ciudad", exact: true })
    .click();
  await page.getByRole("option", { name: "Guadalajara", exact: true }).click();
  await page.reload();
  await expect(search).toHaveValue("cardiologia");
  await expect(page.locator("[data-doctor-card]")).toHaveCount(1);
  const href = await page
    .getByRole("link", { name: "Ver perfil", exact: true })
    .getAttribute("href");
  expect(new URL(href!, "http://localhost:3000").searchParams.get("from")).toBe(
    "/patient/doctors?q=cardiologia&city=Guadalajara",
  );
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.locator("[data-doctor-card]")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Ordenar resultados", exact: true })
    .click();
  await page.getByRole("option", { name: "Precio menor", exact: true }).click();
  await expect(page.locator("[data-doctor-card]").first()).toContainText(
    "Elena Ríos",
  );
});

test("mobile directory supports nested filters, map access and recovery states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/basemaps.cartocdn.com/**", (route) => route.abort());
  await page.goto("/design-system/discovery");
  await page
    .getByRole("button", { name: "Abrir filtros", exact: true })
    .click();
  const sheet = page.getByRole("dialog", {
    name: "Filtrar doctores",
    exact: true,
  });
  await sheet
    .getByRole("combobox", { name: "Filtrar por especialidad", exact: true })
    .click();
  await page.getByRole("option", { name: "Cardiología", exact: true }).click();
  await sheet
    .getByRole("button", { name: "Ver 1 resultados", exact: true })
    .click();
  await expect(page.locator("[data-doctor-card]")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ver mapa con 1 ubicaciones", exact: true })
    .click();
  const map = page.getByRole("dialog", {
    name: "Mapa de consultorios",
    exact: true,
  });
  await expect(
    map.getByRole("heading", { name: "Doctores en el mapa", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/discovery-map-mobile.png",
    animations: "disabled",
  });
  await map.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("radio", { name: "Error", exact: true }).click();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator("[data-doctor-card]")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, "directory-mobile");
});

test("public profile and booking preserve selection through login and registration", async ({
  page,
}) => {
  const mock = await mockBooking(page);
  const from = "/patient/doctors?q=Alicia";
  await page.goto(`/doctor/${doctorId}?${new URLSearchParams({ from })}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Alicia de Prueba",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "profile");
  await page.getByRole("link", { name: "Reservar", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Consulta de muestra/ }),
  ).toBeChecked();
  await capture(page, "booking-service");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: /^Fecha de la reserva:/ }).click();
  const picker = page.getByRole("dialog", {
    name: "Fecha de la reserva",
    exact: true,
  });
  await picker.getByLabel("Escribir fecha").fill(typedDate(calendarDay(3)));
  await picker.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(picker.getByRole("alert")).toHaveText(
    "Esta fecha no tiene horarios disponibles.",
  );
  await picker.getByLabel("Escribir fecha").fill(typedDate(availableDay));
  await picker.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Horario de consulta", exact: true })
    .click();
  await page.getByRole("option", { name: "09:00", exact: true }).click();
  await capture(page, "booking-availability");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Barra lateral", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: /Motivo de consulta/ }),
  ).toHaveCount(0);
  const login = page.getByRole("link", {
    name: "Iniciar sesión para continuar",
    exact: true,
  });
  await capture(page, "booking-login");
  const destination = new URL(
    (await login.getAttribute("href"))!,
    "http://localhost:3000",
  ).searchParams.get("callbackUrl");
  const params = new URL(destination!, "http://localhost:3000").searchParams;
  expect(params.get("serviceId")).toBe(serviceId);
  expect(params.get("date")).toBe(availableDay);
  expect(params.get("time")).toBe("09:00");
  expect(params.get("from")).toBe(from);
  await login.click();
  await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
  const returnLogin = page.getByRole("link", {
    name: "Iniciar sesión",
    exact: true,
  });
  expect(
    new URL(
      (await returnLogin.getAttribute("href"))!,
      "http://localhost:3000",
    ).searchParams.get("callbackUrl"),
  ).toBe(destination);
  expect(mock.endpoints).not.toContain("notifications.unreadCount");
  expect(mock.mutations).toHaveLength(0);
});

test("booking recovers from a slot conflict without losing the consultation details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mock = await mockBooking(page, { patient: true, conflict: true });
  await page.goto(
    `/book-appointment/${doctorId}?${new URLSearchParams({ serviceId, date: availableDay, time: "09:00", resume: "1" })}`,
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("textbox", { name: /Motivo de consulta/ })
    .fill("Seguimiento de muestra");
  await page
    .getByRole("textbox", { name: "Alergias conocidas", exact: true })
    .fill("Dato ficticio");
  await expect(
    page.getByRole("button", { name: "Solicitar cita", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect
    .poll(async () =>
      page
        .getByRole("textbox", { name: "Alergias conocidas", exact: true })
        .evaluate((field) => {
          const actions = document
            .querySelector("[data-booking-actions]")!
            .getBoundingClientRect();
          return field.getBoundingClientRect().bottom <= actions.top - 8;
        }),
    )
    .toBe(true);
  await capture(page, "booking-details-mobile", false);
  await page
    .getByRole("button", { name: "Solicitar cita", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Elige fecha y hora", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeDisabled();
  await capture(page, "booking-conflict-mobile", false);
  await chooseTime(page, "10:30");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /Motivo de consulta/ }),
  ).toHaveValue("Seguimiento de muestra");
  await expect(
    page.getByRole("textbox", { name: "Alergias conocidas", exact: true }),
  ).toHaveValue("Dato ficticio");
  await page
    .getByRole("button", { name: "Solicitar cita", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Solicitud enviada", exact: true }),
  ).toBeVisible();
  await capture(page, "booking-success-mobile", false);
  expect(mock.mutations).toHaveLength(2);
  expect(mock.mutations[1]?.patientId).toBe("test-patient");
  expect((mock.mutations[1]?.date as Date).toISOString().slice(0, 10)).toBe(
    availableDay,
  );
  await expect(
    page.getByRole("link", { name: "Ver mi solicitud", exact: true }),
  ).toHaveAttribute("href", "/patient/appointments/test-appointment");
});

test("services can be retried and an empty schedule cannot be submitted", async ({
  page,
}) => {
  const mock = await mockBooking(page, { serviceError: true, empty: true });
  await page.goto(`/book-appointment/${doctorId}?serviceId=${serviceId}`);
  await page
    .getByRole("button", { name: "Reintentar servicios", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: /Consulta de muestra/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByText(/No hay horarios libres en el próximo mes/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeDisabled();
  expect(mock.mutations).toHaveLength(0);
});

test("missing profiles recover and the real patient directory remains private", async ({
  page,
}) => {
  await mockBooking(page, { missingDoctor: true });
  await page.goto(`/doctor/${doctorId}`);
  await expect(
    page.getByRole("heading", { name: "Perfil no disponible", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver", exact: true }),
  ).toHaveAttribute("href", "/");
  const response = await page.request.get("/patient/doctors", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/login");
});
