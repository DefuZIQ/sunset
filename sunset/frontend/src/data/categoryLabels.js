const genderedPrefix = /^(?:женск(?:ая|ие|ий|ое)|мужск(?:ая|ие|ий|ое))\s+/i;
const roots = new Set(["Для женщин", "Для мужчин"]);

export function categoryLabel(name) {
  if (name === "Для женщин") return "Женщинам";
  if (name === "Для мужчин") return "Мужчинам";
  const original = String(name || "");
  const label = original.replace(genderedPrefix, "");
  return label === original ? original : label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1);
}

export function categoryPath(categories = []) {
  return categories.filter((name) => !roots.has(name)).map(categoryLabel);
}

export function categoryRoots(tree = [], gender = "all") {
  if (gender === "WOMEN" || gender === "MEN") {
    const name = gender === "WOMEN" ? "Для женщин" : "Для мужчин";
    return tree.find((node) => node.name === name)?.children || [];
  }
  return tree;
}
