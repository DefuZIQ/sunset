import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./contexts/StoreContext", () => ({
  StoreProvider: ({ children }) => children,
  useStore: () => ({ products: [], categoryTree: [], loading: false }),
}));

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

afterEach(() => jest.restoreAllMocks());

test("renders the main navigation and brand", () => {
  render(<App />);
  expect(screen.getAllByLabelText("SUNSET").length).toBeGreaterThan(0);
  expect(screen.getByText("КАТАЛОГ")).toBeInTheDocument();
  expect(screen.getByText("КОНТАКТЫ")).toBeInTheDocument();
});

test("redirects a guest away from the admin route", async () => {
  window.location.hash = "#/admin";
  render(<App />);
  expect(await screen.findByText("Личный кабинет")).toBeInTheDocument();
});
