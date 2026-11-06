import { expect, test } from "@playwright/test";

test("muestra la demo, busca productos y filtra reposición", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("heading", { name: "Vista general", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Modo demostración.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Mostrando 6 de 6 productos de demostración"),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar productos" }).fill("TEC-001");
  await expect(
    page.getByText("Mostrando 1 de 6 productos de demostración"),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar productos" })
    .fill("inexistente");
  await expect(
    page.getByText("No hay productos que coincidan con los filtros."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("button", { name: "Mostrar solo stock bajo" }).click();
  await expect(
    page.getByText("Mostrando 3 de 6 productos de demostración"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("cambia de inventario y reinicia el contexto al cambiar de empresa", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("combobox", { name: "Inventario", exact: true }).click();
  await page.getByRole("option", { name: "Repuestos y mantenimiento" }).click();
  await expect(
    page.getByText("Mostrando 2 de 2 productos de demostración"),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Rodamiento industrial/ }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Empresa", exact: true }).click();
  await page.getByRole("option", { name: "Sur Estudio" }).click();
  await expect(
    page.getByRole("combobox", { name: "Inventario", exact: true }),
  ).toHaveText("Equipamiento del estudio");
  await expect(
    page.getByRole("cell", { name: /Monitor de estudio/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Rodamiento industrial/ }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "Inventario", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(1);
});

test("mantiene cerradas las rutas de autenticación", async ({ request }) => {
  for (const method of ["get", "post"] as const) {
    const response = await request[method]("/api/auth/get-session");
    expect(response.status()).toBe(503);
    expect(await response.json()).toMatchObject({ error: "AUTH_NOT_ENABLED" });
  }
});

test("ofrece navegación móvil sin desbordar la página", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Verificación específica de móvil");
  await page.goto("/demo");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Stock de productos" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
