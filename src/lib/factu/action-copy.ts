import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import type { FactuEmptyVariant } from "./copy";

export function normalizeFactuEmptyActionCopy(
  variant: FactuEmptyVariant,
  action: ReactNode,
): ReactNode {
  if (variant !== "cliente") return action;
  return replaceActionCopy(action, "Nuevo cliente", "Crear cliente");
}

function replaceActionCopy(
  node: ReactNode,
  from: string,
  to: string,
): ReactNode {
  if (typeof node === "string") return node.replace(from, to);
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;

  const children = node.props.children;
  if (children === undefined) return node;

  return cloneElement(
    node,
    undefined,
    Children.map(children, (child) => replaceActionCopy(child, from, to)),
  );
}
