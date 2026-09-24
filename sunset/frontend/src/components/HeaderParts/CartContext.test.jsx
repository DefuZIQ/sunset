import { act, renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "./CartContext";

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
const shirt = {
  id: "product-1",
  name: "Рубашка",
  selectedColorId: "black",
  selectedSizeId: "m",
};

beforeEach(() => localStorage.clear());

test("keeps different variants as separate cart lines", () => {
  const { result } = renderHook(() => useCart(), { wrapper });
  act(() => result.current.addToCart(shirt));
  act(() => result.current.addToCart({ ...shirt, selectedSizeId: "l" }));
  expect(Object.keys(result.current.cartItems)).toHaveLength(2);
  expect(result.current.cartItemCount).toBe(2);
});

test("increments, decrements and removes an exact variant", () => {
  const { result } = renderHook(() => useCart(), { wrapper });
  act(() => result.current.addToCart(shirt));
  act(() => result.current.addToCart(shirt));
  expect(result.current.getItemQuantity("product-1", "black", "m")).toBe(2);
  act(() => result.current.decreaseQuantity("product-1", "black", "m"));
  expect(result.current.getItemQuantity("product-1", "black", "m")).toBe(1);
  act(() => result.current.removeFromCart("product-1", "black", "m"));
  expect(result.current.cartItemCount).toBe(0);
});

test("restores cart state from localStorage", () => {
  localStorage.setItem(
    "cartItems",
    JSON.stringify({
      "product-1::black::m": { product: shirt, quantity: 3 },
    }),
  );
  const { result } = renderHook(() => useCart(), { wrapper });
  expect(result.current.cartItemCount).toBe(3);
  expect(result.current.getItemQuantity("product-1")).toBe(3);
});

test("clearCart removes every cart line", () => {
  const { result } = renderHook(() => useCart(), { wrapper });
  act(() => result.current.addToCart(shirt));
  act(() => result.current.clearCart());
  expect(result.current.cartItems).toEqual({});
});
