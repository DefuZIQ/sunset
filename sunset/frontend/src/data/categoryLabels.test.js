import { describe, expect, it } from "vitest";
import { categoryLabel, categoryPath, categoryRoots } from "./categoryLabels";

describe("category presentation", () => {
  it("removes repeated gender prefixes without changing canonical names", () => {
    expect(categoryLabel("Женская верхняя одежда")).toBe("Верхняя одежда");
    expect(categoryLabel("Мужские куртки")).toBe("Куртки");
    expect(categoryLabel("Женские боди")).toBe("Боди");
    expect(categoryLabel("Аксессуары")).toBe("Аксессуары");
  });

  it("shows gender once, separately from the product category path", () => {
    expect(categoryPath(["Для женщин", "Женская верхняя одежда", "Женские пальто"]))
      .toEqual(["Верхняя одежда", "Пальто"]);
  });

  it("does not repeat the gender root when a department is selected", () => {
    const tree = [
      { name: "Для женщин", children: [{ name: "Женские платья" }] },
      { name: "Для мужчин", children: [{ name: "Мужские брюки" }] },
    ];
    expect(categoryRoots(tree, "WOMEN")).toEqual(tree[0].children);
    expect(categoryRoots(tree, "MEN")).toEqual(tree[1].children);
    expect(categoryRoots(tree)).toEqual(tree);
  });
});
