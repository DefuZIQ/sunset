import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import AdminAccessPanel from "./AdminAccessPanel";
import { getIamUserPermissions, updateIamUserRole } from "../../api/client";

vi.mock("../../api/client", () => ({
  ADMIN_COOKIE_SESSION: "ADMIN_COOKIE_SESSION",
  getIamUserPermissions: vi.fn(),
  updateIamUserRole: vi.fn(),
}));

beforeEach(() => { vi.clearAllMocks(); });

test("assigns warehouse role only with an active warehouse scope", async () => {
  getIamUserPermissions.mockResolvedValue({ role: "CUSTOMER", staffRole: null, locationId: null, permissions: [] });
  updateIamUserRole.mockResolvedValue({ role: "STAFF", staffRole: "WAREHOUSE_ADMIN", locationId: "warehouse-1", permissions: ["stock:write"] });
  render(<AdminAccessPanel users={[{ id: "user-1", email: "user@example.test", role: "CUSTOMER" }]}
    locations={[{ id: "warehouse-1", name: "Центральный склад", city: "Нижний Новгород", kind: "WAREHOUSE", active: true },
      { id: "store-1", name: "Магазин", city: "Нижний Новгород", kind: "STORE", active: true }]} />);

  fireEvent.change(screen.getByLabelText("Учётная запись"), { target: { value: "user-1" } });
  await screen.findByText(/Текущий доступ:/);
  fireEvent.change(screen.getByLabelText("Новая роль"), { target: { value: "WAREHOUSE_ADMIN" } });
  const scope = screen.getByLabelText("Склад");
  expect(within(scope).getByRole("option", { name: /Центральный склад/ })).toBeInTheDocument();
  expect(within(scope).queryByRole("option", { name: /Магазин/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Назначить роль" })).toBeDisabled();
  fireEvent.change(scope, { target: { value: "warehouse-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Назначить роль" }));

  await waitFor(() => expect(updateIamUserRole).toHaveBeenCalledWith("ADMIN_COOKIE_SESSION", "user-1", "WAREHOUSE_ADMIN", "warehouse-1"));
  expect(await screen.findByText(/Прежние сеансы завершены/)).toBeInTheDocument();
});

test("does not offer editing another administrator", async () => {
  getIamUserPermissions.mockResolvedValue({ role: "ADMIN", permissions: ["stock:write"] });
  render(<AdminAccessPanel users={[{ id: "admin-2", email: "admin@example.test", role: "ADMIN" }]} />);
  fireEvent.change(screen.getByLabelText("Учётная запись"), { target: { value: "admin-2" } });
  await screen.findByText(/Текущий доступ:/);
  expect(screen.queryByLabelText("Новая роль")).not.toBeInTheDocument();
  expect(updateIamUserRole).not.toHaveBeenCalled();
});
