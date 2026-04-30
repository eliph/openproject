import {
  buildMoveFormData,
  isItemData,
  resolveFallbackDropTarget,
  resolveListTargetId,
  resolveListPreviousItemId,
  resolvePreviousItemId,
} from './drag-and-drop';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

describe('backlogs drag and drop helpers', () => {
  function itemRow(id:string):HTMLLIElement {
    const row = document.createElement('li');
    const item = document.createElement('article');

    row.setAttribute('data-backlogs--item-item-id-value', id);
    row.appendChild(item);

    return row;
  }

  function showMoreRow():HTMLLIElement {
    const row = document.createElement('li');

    row.dataset.draggableId = 'hidden-item';

    return row;
  }

  describe('isItemData', () => {
    it('accepts backlogs item data', () => {
      expect(isItemData({ type: 'item', itemId: '42' })).toBe(true);
    });

    it('rejects data without an item id', () => {
      expect(isItemData({ type: 'item' })).toBe(false);
    });

    it('rejects data with a blank item id', () => {
      expect(isItemData({ type: 'item', itemId: '' })).toBe(false);
    });
  });

  describe('buildMoveFormData', () => {
    it('serializes target id and previous item id for the move endpoint', () => {
      const data = buildMoveFormData({ targetId: 'backlog_bucket:7', previousItemId: '12' });

      expect(data.get('target_id')).toEqual('backlog_bucket:7');
      expect(data.get('prev_id')).toEqual('12');
    });

    it('serializes a top-of-list move as an empty prev_id', () => {
      const data = buildMoveFormData({ targetId: 'inbox', previousItemId: null });

      expect(data.get('target_id')).toEqual('inbox');
      expect(data.get('prev_id')).toEqual('');
    });
  });

  describe('resolvePreviousItemId', () => {
    it('uses the target item as previous item when dropping on the bottom edge', () => {
      const target = itemRow('3').querySelector<HTMLElement>('article')!;

      expect(resolvePreviousItemId({ sourceItemId: '1', targetItem: target, closestEdge: 'bottom' })).toEqual('3');
    });

    it('uses the row item as previous item when the drop target is the row', () => {
      const target = itemRow('3');

      expect(resolvePreviousItemId({ sourceItemId: '1', targetItem: target, closestEdge: 'bottom' })).toEqual('3');
    });

    it('uses the previous row item when dropping on the top edge', () => {
      const list = document.createElement('ul');
      const first = itemRow('1');
      const targetRow = itemRow('3');
      const target = targetRow.querySelector<HTMLElement>('article')!;

      list.append(first, targetRow);

      expect(resolvePreviousItemId({ sourceItemId: '2', targetItem: target, closestEdge: 'top' })).toEqual('1');
    });

    it('uses the previous row item when dropping on the top edge of a row target', () => {
      const list = document.createElement('ul');
      const first = itemRow('1');
      const targetRow = itemRow('3');

      list.append(first, targetRow);

      expect(resolvePreviousItemId({ sourceItemId: '2', targetItem: targetRow, closestEdge: 'top' })).toEqual('1');
    });

    it('treats a missing closest edge as dropping before the target item', () => {
      const list = document.createElement('ul');
      const first = itemRow('1');
      const targetRow = itemRow('3');
      const target = targetRow.querySelector<HTMLElement>('article')!;

      list.append(first, targetRow);

      expect(resolvePreviousItemId({ sourceItemId: '2', targetItem: target, closestEdge: null })).toEqual('1');
    });

    it('skips the source item and non-card rows when resolving the previous item', () => {
      const list = document.createElement('ul');
      const first = itemRow('1');
      const source = itemRow('2');
      const targetRow = itemRow('3');
      const target = targetRow.querySelector<HTMLElement>('article')!;

      list.append(first, showMoreRow(), source, targetRow);

      expect(resolvePreviousItemId({ sourceItemId: '2', targetItem: target, closestEdge: 'top' })).toEqual('1');
    });

    it('returns null when dropping before the first item', () => {
      const target = itemRow('1').querySelector<HTMLElement>('article')!;

      expect(resolvePreviousItemId({ sourceItemId: '2', targetItem: target, closestEdge: 'top' })).toBeNull();
    });
  });

  describe('resolveListTargetId', () => {
    it('reads the nearest list target id', () => {
      const list = document.createElement('ul');
      const row = itemRow('1');
      const item = row.querySelector<HTMLElement>('article')!;

      list.dataset.backlogsTarget = 'list';
      list.dataset.backlogsTargetId = 'sprint:12';
      list.appendChild(row);

      expect(resolveListTargetId(item)).toEqual('sprint:12');
    });
  });

  describe('resolveFallbackDropTarget', () => {
    function input({ clientX = 10, clientY = 10 } = {}) {
      return {
        altKey: false,
        button: 0,
        buttons: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        clientX,
        clientY,
        pageX: clientX,
        pageY: clientY,
      };
    }

    function rect():DOMRect {
      return {
        top: 0,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    }

    function stubElementFromPoint(element:Element) {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: vi.fn(() => element),
      });
    }

    function stubElementsFromPoint(elements:Element[]) {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: vi.fn(() => elements),
      });
    }

    afterEach(() => {
      vi.restoreAllMocks();
      document.body.replaceChildren();
    });

    it('resolves an item at the drop coordinates', () => {
      const root = document.createElement('div');
      const list = document.createElement('div');
      const row = itemRow('42');
      const item = row.querySelector<HTMLElement>('article')!;

      list.setAttribute('data-backlogs-target', 'list');
      list.setAttribute('data-backlogs-target-id', 'backlog_bucket:7');
      list.appendChild(row);
      root.appendChild(list);
      document.body.appendChild(root);
      stubElementFromPoint(item);
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect());

      const target = resolveFallbackDropTarget({
        input: input({ clientY: 90 }),
        root,
      });

      expect(target?.element).toBe(row);
      expect(target?.isItem).toBe(true);
      expect(target?.data.itemId).toEqual('42');
      expect(extractClosestEdge(target!.data)).toEqual('bottom');
    });

    it('skips drag overlay elements and resolves the underlying item', () => {
      const root = document.createElement('div');
      const list = document.createElement('div');
      const row = itemRow('42');
      const item = row.querySelector<HTMLElement>('article')!;
      const dragOverlay = document.createElement('div');

      list.setAttribute('data-backlogs-target', 'list');
      list.setAttribute('data-backlogs-target-id', 'backlog_bucket:7');
      list.appendChild(row);
      root.appendChild(list);
      document.body.append(root, dragOverlay);
      stubElementFromPoint(dragOverlay);
      stubElementsFromPoint([dragOverlay, item]);
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect());

      const target = resolveFallbackDropTarget({
        input: input({ clientY: 90 }),
        root,
      });

      expect(target?.element).toBe(row);
      expect(target?.isItem).toBe(true);
      expect(target?.data.itemId).toEqual('42');
    });

    it('resolves a list at the drop coordinates when no item is under the pointer', () => {
      const root = document.createElement('div');
      const list = document.createElement('div');
      const header = document.createElement('div');

      list.setAttribute('data-backlogs-target', 'list');
      list.setAttribute('data-backlogs-target-id', 'backlog_bucket:7');
      list.appendChild(header);
      root.appendChild(list);
      document.body.appendChild(root);
      stubElementFromPoint(header);

      const target = resolveFallbackDropTarget({
        input: input(),
        root,
      });

      expect(target?.element).toBe(list);
      expect(target?.isItem).toBe(false);
      expect(target?.data.targetId).toEqual('backlog_bucket:7');
    });

    it('resolves the containing list instead of the dragged source item', () => {
      const root = document.createElement('div');
      const list = document.createElement('div');
      const row = itemRow('42');
      const item = row.querySelector<HTMLElement>('article')!;

      list.setAttribute('data-backlogs-target', 'list');
      list.setAttribute('data-backlogs-target-id', 'backlog_bucket:7');
      list.appendChild(row);
      root.appendChild(list);
      document.body.appendChild(root);
      stubElementFromPoint(item);

      const target = resolveFallbackDropTarget({
        input: input(),
        root,
        sourceElement: row,
      });

      expect(target?.element).toBe(list);
      expect(target?.isItem).toBe(false);
      expect(target?.data.targetId).toEqual('backlog_bucket:7');
    });

    it('returns null when the drop coordinates are outside the backlogs root', () => {
      const root = document.createElement('div');
      const outside = document.createElement('div');

      document.body.append(root, outside);
      stubElementFromPoint(outside);

      expect(resolveFallbackDropTarget({
        input: input(),
        root,
      })).toBeNull();
    });
  });

  describe('resolveListPreviousItemId', () => {
    it('returns the last item in a list while skipping the source and non-card rows', () => {
      const list = document.createElement('ul');

      list.append(itemRow('1'), showMoreRow(), itemRow('2'), itemRow('3'));

      expect(resolveListPreviousItemId({ sourceItemId: '3', list })).toEqual('2');
    });

    it('returns null when the list has no other items', () => {
      const list = document.createElement('ul');

      list.append(showMoreRow(), itemRow('1'));

      expect(resolveListPreviousItemId({ sourceItemId: '1', list })).toBeNull();
    });
  });
});
