/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { Application } from '@hotwired/stimulus';

import ItemController from './item.controller';

vi.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
  combine: vi.fn((...cleanups:(() => void)[]) => vi.fn(() => {
    cleanups.forEach((cleanup) => cleanup());
  })),
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: vi.fn(() => vi.fn()),
  dropTargetForElements: vi.fn(() => vi.fn()),
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/prevent-unhandled', () => ({
  preventUnhandled: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview', () => ({
  setCustomNativeDragPreview: vi.fn(),
}));

describe('Backlogs item controller', () => {
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  interface TestItemController {
    renderDropIndicator(edge:'top'|'bottom'|null):void;
    clearDropIndicator():void;
  }

  function controllerFor(element:HTMLElement) {
    const controller = Object.create(ItemController.prototype) as unknown as TestItemController;

    Object.defineProperty(controller, 'element', { value: element });
    Object.defineProperty(controller, 'itemIdValue', { value: '1' });

    return controller;
  }

  function connectedControllerFor(element:HTMLElement) {
    const controller = Object.create(ItemController.prototype) as ItemController;

    Object.defineProperty(controller, 'element', { value: element });
    Object.defineProperty(controller, 'itemIdValue', { value: '123' });

    controller.connect();

    return controller;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dropTargetForElements).mockImplementation(({ element }) => {
      element.setAttribute('data-drop-target-for-element', 'true');

      return vi.fn(() => {
        element.removeAttribute('data-drop-target-for-element');
      });
    });
  });

  it('marks the closest edge while dragging over an item', () => {
    const element = document.createElement('article');
    const controller = controllerFor(element);

    controller.renderDropIndicator('top');

    expect(element.dataset.dropPosition).toEqual('top');
  });

  it('marks the closest edge on the containing row when present', () => {
    const element = document.createElement('li');
    const controller = controllerFor(element);

    element.classList.add('Box-row');

    controller.renderDropIndicator('top');

    expect(element.dataset.dropPosition).toEqual('top');
  });

  it('renders the bottom edge as the next row top edge when both describe the same insertion point', () => {
    const element = document.createElement('li');
    const nextElement = document.createElement('li');
    const controller = controllerFor(element);

    element.setAttribute('data-backlogs--item-item-id-value', '1');
    nextElement.setAttribute('data-backlogs--item-item-id-value', '2');
    document.body.append(element, nextElement);

    controller.renderDropIndicator('bottom');

    expect(element.hasAttribute('data-drop-position')).toBe(false);
    expect(nextElement.dataset.dropPosition).toEqual('top');
  });

  it('removes the drop position when leaving an item', () => {
    const element = document.createElement('li');
    const nextElement = document.createElement('li');
    const controller = controllerFor(element);

    element.setAttribute('data-backlogs--item-item-id-value', '1');
    nextElement.setAttribute('data-backlogs--item-item-id-value', '2');
    document.body.append(element, nextElement);

    controller.renderDropIndicator('bottom');
    controller.clearDropIndicator();

    expect(element.hasAttribute('data-drop-position')).toBe(false);
    expect(nextElement.hasAttribute('data-drop-position')).toBe(false);
  });

  it('does not clear an indicator owned by another item controller', () => {
    const element = document.createElement('li');
    const nextElement = document.createElement('li');
    const controller = controllerFor(element);

    element.setAttribute('data-backlogs--item-item-id-value', '1');
    nextElement.setAttribute('data-backlogs--item-item-id-value', '2');
    document.body.append(element, nextElement);

    controller.renderDropIndicator('bottom');
    nextElement.dataset.dropPosition = 'top';
    nextElement.dataset.dropPositionOwner = '2';

    controller.clearDropIndicator();

    expect(nextElement.dataset.dropPosition).toEqual('top');
    expect(nextElement.dataset.dropPositionOwner).toEqual('2');
  });

  it('keeps the item drop target active while moving through row gaps', () => {
    const element = document.createElement('article');

    connectedControllerFor(element);

    expect(vi.mocked(dropTargetForElements).mock.lastCall?.[0].getIsSticky?.({
      element,
      input: {} as never,
      source: {
        data: {},
        element: document.createElement('article'),
      } as never,
    })).toBe(true);
  });

  it('does not accept itself as an item drop target', () => {
    const element = document.createElement('article');

    connectedControllerFor(element);

    expect(vi.mocked(dropTargetForElements).mock.lastCall?.[0].canDrop?.({
      element,
      input: {} as never,
      source: {
        data: { type: 'item', itemId: '123' },
        element: document.createElement('article'),
      } as never,
    })).toBe(false);
  });

  it('does not expose native external drag data', () => {
    const element = document.createElement('article');

    connectedControllerFor(element);

    expect(vi.mocked(draggable).mock.lastCall?.[0].getInitialDataForExternal).toBeUndefined();
  });

  it('prevents unhandled browser drag feedback while dragging an item', () => {
    const element = document.createElement('article');

    connectedControllerFor(element);

    vi.mocked(draggable).mock.lastCall?.[0].onDragStart?.({} as never);
    expect(preventUnhandled.start).toHaveBeenCalledOnce();

    vi.mocked(draggable).mock.lastCall?.[0].onDrop?.({} as never);
    expect(preventUnhandled.stop).toHaveBeenCalledOnce();
  });

  describe('Stimulus application wiring', () => {
    let application:Application;
    let fixture:HTMLElement;

    beforeEach(() => {
      fixture = document.createElement('div');
      document.body.appendChild(fixture);

      application = Application.start();
      application.register('backlogs--item', ItemController);
    });

    afterEach(() => {
      application.stop();
      fixture.remove();
    });

    function renderBacklogsRow(itemId = '123') {
      fixture.innerHTML = `
        <li
          class="Box-row"
          data-controller="backlogs--item"
          data-test-selector="work-package-${itemId}"
          data-drop-url="/move"
          data-backlogs--item-item-id-value="${itemId}"
        >
          <article
            data-controller="backlogs--story"
            data-backlogs--item-target="preview"
            data-action="click->backlogs--story#select"
            data-dragging="source"
            data-drop-position="top"
            data-drop-position-owner="${itemId}"
          >
            <span
              data-controller="nested"
              data-action="click->nested#noop"
              data-backlogs--story-target="subject"
            ></span>
          </article>
        </li>
      `;

      return {
        row: fixture.querySelector<HTMLElement>('.Box-row')!,
        article: fixture.querySelector<HTMLElement>('[data-controller="backlogs--story"]')!,
      };
    }

    it('registers the row as both draggable and drop target', async () => {
      const { row } = renderBacklogsRow();

      await nextFrame();

      expect(vi.mocked(draggable)).toHaveBeenCalledWith(expect.objectContaining({
        element: row,
      }));
      expect(vi.mocked(dropTargetForElements)).toHaveBeenCalledWith(expect.objectContaining({
        element: row,
      }));
    });

    it('renders a sanitized copy of the preview target for the native drag preview', async () => {
      const { article } = renderBacklogsRow();
      const nativeSetDragImage = vi.fn();
      const previewContainer = document.createElement('div');

      vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 320,
        bottom: 64,
        width: 320,
        height: 64,
        toJSON: vi.fn(),
      });

      await nextFrame();

      vi.mocked(draggable).mock.lastCall?.[0].onGenerateDragPreview?.({
        nativeSetDragImage,
      } as never);

      expect(setCustomNativeDragPreview).toHaveBeenCalledOnce();

      const previewOptions = vi.mocked(setCustomNativeDragPreview).mock.lastCall?.[0] as {
        render:({ container }:{ container:HTMLElement }) => void;
        nativeSetDragImage:typeof nativeSetDragImage;
      };

      expect(previewOptions.nativeSetDragImage).toBe(nativeSetDragImage);

      previewOptions.render({ container: previewContainer });

      const preview = previewContainer.firstElementChild as HTMLElement;

      expect(preview).not.toBe(article);
      expect(preview.tagName).toEqual('ARTICLE');
      expect(preview.style.width).toEqual('320px');
      expect(preview.hasAttribute('data-preview')).toBe(true);
      expect(preview.hasAttribute('data-controller')).toBe(false);
      expect(preview.hasAttribute('data-backlogs--item-target')).toBe(false);
      expect(preview.hasAttribute('data-action')).toBe(false);
      expect(preview.hasAttribute('data-dragging')).toBe(false);
      expect(preview.hasAttribute('data-drop-position')).toBe(false);
      expect(preview.hasAttribute('data-drop-position-owner')).toBe(false);
      expect(preview.querySelector('[data-controller]')).toBeNull();
      expect(preview.querySelector('[data-action]')).toBeNull();
      expect(preview.querySelector('[data-backlogs--story-target]')).toBeNull();
    });

    it('refreshes the row registrations after Turbo morphing removes dynamic Pragmatic DnD attributes', async () => {
      const { row } = renderBacklogsRow();

      await nextFrame();
      expect(row.dataset.dropTargetForElement).toEqual('true');

      row.removeAttribute('data-drop-target-for-element');
      row.dispatchEvent(new CustomEvent('turbo:morph-element', {
        bubbles: true,
        composed: true,
        detail: {
          currentElement: row,
          newElement: row.cloneNode(true),
        },
      }));

      expect(row.dataset.dropTargetForElement).toEqual('true');
      expect(vi.mocked(draggable)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(dropTargetForElements)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(dropTargetForElements).mock.lastCall?.[0]).toEqual(expect.objectContaining({
        element: row,
      }));
    });
  });
});
