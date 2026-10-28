import { expect, test } from "vitest";
import { adminUrl, storefrontUrl } from "./adminUrls";

test("storefront links lead to the isolated public admin host", () => {
  expect(adminUrl("t3ch.pro")).toBe("https://admin.t3ch.pro/");
  expect(adminUrl("www.t3ch.pro")).toBe("https://admin.t3ch.pro/");
});

test("local deployments keep their existing administration path", () => {
  expect(adminUrl("192.168.1.186")).toBe("/admin/");
  expect(adminUrl("localhost")).toBe("/admin/");
});

test("admin brand and shop link return to the storefront", () => {
  expect(storefrontUrl("admin.t3ch.pro")).toBe("https://t3ch.pro/");
  expect(storefrontUrl("192.168.1.186")).toBe("/");
});
