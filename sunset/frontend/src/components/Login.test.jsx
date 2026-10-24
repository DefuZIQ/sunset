import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import Login from "./Login";
import { ApiHttpError, loginCustomer } from "../api/client";

vi.mock("../api/client", () => ({
  loginCustomer: vi.fn(),
  ApiHttpError: class ApiHttpError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  },
}));

test("customer login does not redirect staff credentials to the admin site", async () => {
  loginCustomer.mockResolvedValueOnce({ mfaRequired: true, challengeToken: "challenge" });
  render(<MemoryRouter><Login setUser={vi.fn()} /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "staff@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("heading", { name: "Аккаунт не найден" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Создать аккаунт" })).toHaveAttribute("href", "/register");
  expect(screen.getByText(/нужен другой адрес/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Продолжить в админке" })).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Одноразовый код")).not.toBeInTheDocument();
});

test("missing customer account offers registration", async () => {
  loginCustomer.mockRejectedValueOnce(new ApiHttpError(404, "Пользователь не найден"));
  render(<MemoryRouter><Login setUser={vi.fn()} /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("heading", { name: "Аккаунт не найден" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Создать аккаунт" })).toHaveAttribute("href", "/register");
  expect(screen.queryByText(/нужен другой адрес/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Войти с другим email" }));
  expect(screen.getByPlaceholderText("Email")).toHaveValue("new@example.test");
});

test("wrong password remains a login error", async () => {
  loginCustomer.mockRejectedValueOnce(new ApiHttpError(401, "Неверный email или пароль"));
  render(<MemoryRouter><Login setUser={vi.fn()} /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "customer@example.test" } });
  fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "wrong-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Неверный email или пароль");
  expect(screen.queryByRole("heading", { name: "Аккаунт не найден" })).not.toBeInTheDocument();
});
