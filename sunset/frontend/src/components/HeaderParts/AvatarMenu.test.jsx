import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import AvatarMenu from "./AvatarMenu";

test("signed-in menu uses section icons instead of arrow glyphs", () => {
  const { container } = render(
    <MemoryRouter>
      <AvatarMenu
        isAuthenticated
        user={{ firstName: "Анна", email: "anna@example.test", role: "ADMIN" }}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  );

  for (const label of ["Личный кабинет", "Мои заказы", "Уведомления", "Изменить пароль", "Управление магазином"]) {
    expect(screen.getByRole("menuitem", { name: label }).querySelector(".popup-action-icon svg")).toBeInTheDocument();
  }
  expect(screen.getByRole("button", { name: "Выйти" }).querySelector(".popup-action-icon svg")).toBeInTheDocument();
  expect(container.querySelector(".profile-popup--signed")).not.toHaveTextContent(/[→↗]/);
});

test("guest menu uses icons for sign-in and registration", () => {
  const { container } = render(
    <MemoryRouter>
      <AvatarMenu isAuthenticated={false} onLogout={vi.fn()} isPopupOpen={false} />
    </MemoryRouter>,
  );

  for (const label of ["Войти", "Создать аккаунт"]) {
    expect(screen.getByRole("menuitem", { name: label }).querySelector(".popup-action-icon svg")).toBeInTheDocument();
  }
  expect(container.querySelector(".profile-popup--guest")).not.toHaveTextContent(/[→↗]/);
});

test("guest popup closes after navigation and reopens on the profile icon", () => {
  const { container } = render(
    <MemoryRouter>
      <AvatarMenu isAuthenticated={false} onLogout={vi.fn()} isPopupOpen={false} />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("menuitem", { name: "Войти" }));
  expect(container.querySelector(".dropdown--account")).toHaveClass("dropdown--dismissed");
  fireEvent.mouseEnter(screen.getByRole("button", { name: "Профиль" }));
  expect(container.querySelector(".dropdown--account")).not.toHaveClass("dropdown--dismissed");
});

test("signed-in popup closes after opening a section", () => {
  const { container } = render(
    <MemoryRouter>
      <AvatarMenu isAuthenticated user={{ firstName: "Анна" }} onLogout={vi.fn()} />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("menuitem", { name: "Мои заказы" }));
  expect(container.querySelector(".dropdown--account")).toHaveClass("dropdown--dismissed");
});
