import {
  attachClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Input } from '@atlaskit/pragmatic-drag-and-drop/types';

export interface ItemData extends Record<string | symbol, unknown> {
  type:'item';
  itemId:string;
}

const itemSelector = '[data-backlogs--item-item-id-value]';
const listSelector = '[data-backlogs-target~="list"]';

export interface FallbackDropTarget {
  element:HTMLElement;
  data:Record<string | symbol, unknown>;
  isItem:boolean;
}

export function isItemData(data:Record<string | symbol, unknown>):data is ItemData {
  return data.type === 'item' && typeof data.itemId === 'string' && data.itemId.length > 0;
}

export function itemData(itemId:string):ItemData {
  return { type: 'item', itemId };
}

export function buildMoveFormData({
  targetId,
  previousItemId,
}:{
  targetId:string;
  previousItemId:string|null;
}):FormData {
  const data = new FormData();

  data.append('target_id', targetId);
  data.append('prev_id', previousItemId ?? '');

  return data;
}

export function resolveItemId(element:Element):string|null {
  return element.getAttribute('data-backlogs--item-item-id-value');
}

export function resolveListTargetId(element:Element):string|null {
  return element.closest<HTMLElement>(listSelector)?.getAttribute('data-backlogs-target-id') ?? null;
}

function resolveItemElement(element:Element):HTMLElement|null {
  if (element instanceof HTMLElement && element.matches(itemSelector)) {
    return element;
  }

  return element.closest<HTMLElement>(itemSelector) ??
    element.querySelector<HTMLElement>(itemSelector);
}

function elementsFromPoint(document:Document, clientX:number, clientY:number):Element[] {
  const elements = document.elementsFromPoint?.(clientX, clientY) ?? [];
  const element = document.elementFromPoint(clientX, clientY);

  if (element && !elements.includes(element)) {
    return [...elements, element];
  }

  return elements;
}

export function resolveFallbackDropTarget({
  input,
  root,
  sourceElement,
}:{
  input:Input;
  root:HTMLElement;
  sourceElement?:HTMLElement;
}):FallbackDropTarget|null {
  const elementsAtPoint = elementsFromPoint(root.ownerDocument, input.clientX, input.clientY);

  for (const elementAtPoint of elementsAtPoint) {
    if (!(elementAtPoint instanceof HTMLElement) || !root.contains(elementAtPoint)) {
      continue;
    }

    const item = resolveItemElement(elementAtPoint);
    if (item && item !== sourceElement && root.contains(item)) {
      const itemId = resolveItemId(item);

      if (itemId) {
        return {
          element: item,
          data: attachClosestEdge(itemData(itemId), {
            element: item,
            input,
            allowedEdges: ['top', 'bottom'],
          }),
          isItem: true,
        };
      }
    }

    const list = elementAtPoint.closest<HTMLElement>(listSelector);
    if (list && root.contains(list)) {
      return {
        element: list,
        data: { type: 'list', targetId: resolveListTargetId(list) },
        isItem: false,
      };
    }
  }

  return null;
}

export function resolvePreviousItemId({
  sourceItemId,
  targetItem,
  closestEdge,
}:{
  sourceItemId:string;
  targetItem:HTMLElement;
  closestEdge:Edge | null;
}):string|null {
  const targetItemElement = resolveItemElement(targetItem);
  const targetItemId = targetItemElement ? resolveItemId(targetItemElement) : null;

  if (closestEdge === 'bottom' && targetItemId !== sourceItemId) {
    return targetItemId;
  }

  const targetRow = (targetItemElement ?? targetItem).closest('li');
  let row = targetRow?.previousElementSibling ?? null;

  while (row) {
    const item = resolveItemElement(row);
    const itemId = item ? resolveItemId(item) : null;
    if (itemId && itemId !== sourceItemId) {
      return itemId;
    }

    row = row.previousElementSibling;
  }

  return null;
}

export function resolveListPreviousItemId({
  sourceItemId,
  list,
}:{
  sourceItemId:string;
  list:Element;
}):string|null {
  const rows = Array.from(list.querySelectorAll(':scope > li, :scope > ul > li')).reverse();

  for (const row of rows) {
    const item = resolveItemElement(row);
    const itemId = item ? resolveItemId(item) : null;
    if (itemId && itemId !== sourceItemId) {
      return itemId;
    }
  }

  return null;
}
