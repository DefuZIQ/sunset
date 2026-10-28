import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import AssistantWidget from "./AssistantWidget";

vi.mock("../contexts/StoreContext", () => ({
  useStore: () => ({ products: [] }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

test("native Android voice result is sent to the assistant", async () => {
  const request = vi.fn().mockResolvedValue({
    json: async () => ({ message: "Посмотрите новую коллекцию", productIds: [] }),
  });
  vi.stubGlobal("fetch", request);
  render(<MemoryRouter><AssistantWidget /></MemoryRouter>);

  fireEvent.click(screen.getByRole("button", { name: "Открыть помощника" }));
  window.dispatchEvent(new CustomEvent("sunset-native-voice-result", { detail: "Покажи пальто" }));

  await waitFor(() => expect(request).toHaveBeenCalledWith("/assistant/chat", expect.objectContaining({
    method: "POST",
    body: expect.stringContaining("Покажи пальто"),
  })));
  expect(screen.getByText("Покажи пальто")).toBeInTheDocument();
});
