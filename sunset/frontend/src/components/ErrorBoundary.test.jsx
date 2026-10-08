import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Broken() {
  throw new Error("Sensitive implementation detail");
}

test("shows a safe page fallback with recovery actions", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<ErrorBoundary><Broken /></ErrorBoundary>);

  expect(screen.getByRole("heading", { name: "Не удалось открыть эту страницу" })).toBeVisible();
  expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "#/");
  expect(screen.queryByText("Sensitive implementation detail")).not.toBeInTheDocument();
});

test("can retry a recovered page without clearing customer data", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("cartItems", '{"saved":true}');
  let fail = true;
  function Page() {
    if (fail) throw new Error("temporary failure");
    return <p>Страница открыта</p>;
  }
  render(<ErrorBoundary><Page /></ErrorBoundary>);
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

  expect(screen.getByText("Страница открыта")).toBeVisible();
  expect(localStorage.getItem("cartItems")).toBe('{"saved":true}');
  localStorage.removeItem("cartItems");
});

test("resets a broken page after navigation and has an app-wide fallback", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const view = render(<ErrorBoundary resetKey="/broken"><Broken /></ErrorBoundary>);
  view.rerender(<ErrorBoundary resetKey="/catalog"><p>Каталог работает</p></ErrorBoundary>);
  expect(screen.getByText("Каталог работает")).toBeVisible();

  view.rerender(<ErrorBoundary variant="app" resetKey="/other"><Broken /></ErrorBoundary>);
  expect(screen.getByRole("heading", { name: "Магазин пока не открылся" })).toBeVisible();
});
