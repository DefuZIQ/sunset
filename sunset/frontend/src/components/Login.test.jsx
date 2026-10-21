import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import Login from "./Login";
import { loginCustomer } from "../api/client";

vi.mock("../api/client", () => ({ loginCustomer: vi.fn() }));

test("staff MFA continues only on the isolated admin entry", async () => {
  loginCustomer.mockResolvedValueOnce({ mfaRequired: true, challengeToken: "challenge" });
  render(<MemoryRouter><Login setUser={vi.fn()} /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "staff@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("link", { name: "Продолжить в админке" })).toHaveAttribute("href", "/admin/");
  expect(screen.queryByPlaceholderText("Одноразовый код")).not.toBeInTheDocument();
});
