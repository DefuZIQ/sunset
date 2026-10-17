import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./contexts/StoreContext", () => ({
  StoreProvider: ({ children }) => children,
  useStore: () => ({ products: [], categoryTree: [], loading: false }),
}));

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/";
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

afterEach(() => vi.restoreAllMocks());

test("renders the main navigation and brand", () => {
  render(<App />);
  expect(screen.getAllByLabelText("SUNSET").length).toBeGreaterThan(0);
  expect(screen.getByText("КАТАЛОГ")).toBeInTheDocument();
  expect(screen.getByText("КОНТАКТЫ")).toBeInTheDocument();
});

test("points legacy admin route to the separate administration app", async () => {
  window.location.hash = "#/admin";
  render(<App />);
  expect(await screen.findByRole("link", { name: "Открыть панель" })).toHaveAttribute("href", "/admin/");
});
