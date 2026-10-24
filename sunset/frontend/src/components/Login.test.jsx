import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import Login from "./Login";
import { loginCustomer } from "../api/client";

vi.mock("../api/client", () => ({ loginCustomer: vi.fn() }));

test("customer login does not redirect staff credentials to the admin site", async () => {
  loginCustomer.mockResolvedValueOnce({ mfaRequired: true, challengeToken: "challenge" });
  render(<MemoryRouter><Login setUser={vi.fn()} /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "staff@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByText("Вход в покупательский кабинет для этой учётной записи пока недоступен.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Продолжить в админке" })).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Одноразовый код")).not.toBeInTheDocument();
});
