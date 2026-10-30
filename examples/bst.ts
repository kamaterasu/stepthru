import { traceTree, type TreeInput } from "../src/index";

/** Builds a binary search tree by inserting `values` one at a time. */
export function bstInsert(values: number[]) {
  const t = traceTree(null, "Binary search tree: insert");
  for (const x of values) {
    if (t.root === null) {
      t.addRoot(x);
      continue;
    }
    let id = t.root;
    for (;;) {
      const side = t.compare(x, id) < 0 ? "left" : "right";
      const next = t.child(id, side);
      if (next === null) {
        t.addChild(id, side, x);
        break;
      }
      id = next;
    }
  }
  return t;
}

/** In-order traversal: left subtree, node, right subtree. Visits a BST in sorted order. */
export function inOrder(tree: TreeInput) {
  const t = traceTree(tree, "In-order traversal");
  const walk = (id: number | null) => {
    if (id === null) return;
    t.focus(id);
    const left = t.child(id, "left");
    if (left !== null) {
      walk(left);
      t.focus(id, `Back at ${t.value(id)}`);
    }
    t.visit(id);
    walk(t.child(id, "right"));
  };
  walk(t.root);
  t.note("Done: the visit order is sorted");
  return t;
}
