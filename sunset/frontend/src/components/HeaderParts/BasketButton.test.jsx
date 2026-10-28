import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test } from "vitest";
import BasketButton from "./BasketButton";
import { CartProvider } from "./CartContext";

afterEach(() => localStorage.clear());

test("empty mini-cart shows a catalog icon instead of an arrow", () => {
  const { container } = render(
    <MemoryRouter><CartProvider><BasketButton /></CartProvider></MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Перейти в каталог" }).querySelector(".popup-action-icon svg")).toBeInTheDocument();
  expect(container.querySelector(".cart-popup")).not.toHaveTextContent(/[→↗]/);
});

test("filled mini-cart shows a basket icon instead of an arrow", () => {
  localStorage.setItem("cartItems", JSON.stringify({
    "product-1::default::default": {
      product: { id: "product-1", name: "Пальто", price: 5000 },
      quantity: 1,
    },
  }));
  const { container } = render(
    <MemoryRouter><CartProvider><BasketButton /></CartProvider></MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Перейти в корзину" }).querySelector(".popup-action-icon svg")).toBeInTheDocument();
  expect(container.querySelector(".cart-popup")).not.toHaveTextContent(/[→↗]/);
});

test("mini-cart closes after navigating to the catalog", () => {
  const { container } = render(
    <MemoryRouter><CartProvider><BasketButton /></CartProvider></MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("link", { name: "Перейти в каталог" }));
  expect(container.querySelector(".dropdown--basket")).toHaveClass("dropdown--dismissed");
  fireEvent.mouseEnter(screen.getByRole("button", { name: "Корзина" }));
  expect(container.querySelector(".dropdown--basket")).not.toHaveClass("dropdown--dismissed");
});
