import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import AdminMfaSetup from "./AdminMfaSetup";
import { confirmMandatoryMfaSetup, startMandatoryMfaSetup } from "../api/client";

vi.mock("../api/client", () => ({
  startMandatoryMfaSetup: vi.fn(),
  confirmMandatoryMfaSetup: vi.fn(),
}));

test("shows a local QR code for MFA enrollment and removes it after confirmation", async () => {
  const otpauthUri = "otpauth://totp/SUNSET:admin%40example.test?secret=JBSWY3DPEHPK3PXP&issuer=SUNSET";
  startMandatoryMfaSetup.mockResolvedValueOnce({ secret: "JBSWY3DPEHPK3PXP", otpauthUri });
  confirmMandatoryMfaSetup.mockResolvedValueOnce({ recoveryCodes: ["backup-code"], auth: { token: "token" } });

  const { container } = render(<AdminMfaSetup setupToken="setup-token" onFinish={vi.fn()} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Начать настройку" }));

  expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
  expect(startMandatoryMfaSetup).toHaveBeenCalledWith("setup-token");
  expect(container.querySelector(".admin-mfa__qr svg")).toBeInTheDocument();
  expect(container.querySelector(".admin-mfa__qr title")).toHaveTextContent("QR-код SUNSET");
  expect(screen.getByRole("link", { name: "Открыть в приложении" })).toHaveAttribute("href", otpauthUri);
  expect(container.querySelector(".admin-mfa__qr img")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Шестизначный код" }), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить код" }));
  await waitFor(() => expect(container.querySelector(".admin-mfa__qr")).not.toBeInTheDocument());
  expect(confirmMandatoryMfaSetup).toHaveBeenCalledWith("setup-token", "123456");
});
