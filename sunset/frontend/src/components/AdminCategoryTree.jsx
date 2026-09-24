import React from "react";

const rootForGender = (tree, gender) => {
  if (gender === "WOMEN") return tree.filter((node) => node.name === "Для женщин");
  if (gender === "MEN") return tree.filter((node) => node.name === "Для мужчин");
  return tree;
};

export const categoryDescendants = (tree, categoryName) => {
  let result = [];
  const visit = (node) => {
    if (node.name === categoryName) {
      const collect = (item) => {
        result.push(item.name);
        (item.children || []).forEach(collect);
      };
      collect(node);
      return true;
    }
    return (node.children || []).some(visit);
  };
  tree.some(visit);
  return result.length ? result : [categoryName];
};

export const categoryMatches = (tree, categoryName, productCategories = []) => {
  if (!categoryName) return true;
  return categoryDescendants(tree, categoryName).some((name) => productCategories.includes(name));
};

export const firstLeafCategory = (tree, gender) => {
  let result = "";
  const visit = (node) => {
    if (result) return;
    if (!(node.children || []).length) result = node.name;
    else node.children.forEach(visit);
  };
  rootForGender(tree, gender).forEach(visit);
  return result;
};

function CategoryNode({ node, depth, selected, onSelect, selectBranches }) {
  const children = node.children || [];
  const selectable = selectBranches || children.length === 0;
  return (
    <div className={`admin-category-node admin-category-node--level-${Math.min(depth, 2)}`}>
      <button
        type="button"
        className={`${children.length ? "admin-category-branch" : "admin-category-leaf"} ${selected === node.name ? "selected" : ""}`}
        onClick={() => selectable && onSelect(node.name)}
        disabled={!selectable}
        aria-pressed={selectable ? selected === node.name : undefined}
      >
        <span>{depth > 0 ? "↳" : ""} {node.name}</span>
        {children.length > 0 && <small>{children.length}</small>}
      </button>
      {children.length > 0 && <div className="admin-category-children">{children.map((child) => (
        <CategoryNode key={child.id || child.name} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} selectBranches={selectBranches} />
      ))}</div>}
    </div>
  );
}

export default function AdminCategoryTree({ tree = [], selected, onSelect, gender = "ALL", selectBranches = false, allowAll = false, title = "Категория" }) {
  const visibleTree = rootForGender(tree, gender);
  return (
    <div className="admin-category-picker">
      <div className="admin-category-picker__head">
        <span>{title}</span>
        {selected && <small>{selected}</small>}
      </div>
      <div className="admin-category-tree" role="tree" aria-label={title}>
        {allowAll && <button type="button" className={`admin-category-all ${!selected ? "selected" : ""}`} onClick={() => onSelect("")}>Все категории</button>}
        {visibleTree.length === 0 && <p>Категории загружаются…</p>}
        {visibleTree.map((node) => <CategoryNode key={node.id || node.name} node={node} depth={0} selected={selected} onSelect={onSelect} selectBranches={selectBranches} />)}
      </div>
    </div>
  );
}
