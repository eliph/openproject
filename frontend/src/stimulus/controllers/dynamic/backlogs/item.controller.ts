import { Controller } from '@hotwired/stimulus';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

import { itemData, isItemData, type ItemData } from './drag-and-drop';

type CleanupFn = () => void;
const itemSelector = '[data-backlogs--item-item-id-value]';

export default class ItemController extends Controller<HTMLElement> {
  static values = { itemId: String };
  static targets = ['preview'];

  declare itemIdValue:string;
  declare readonly previewTarget:HTMLElement;

  private cleanupFn?:CleanupFn;
  private dropIndicatorElement?:HTMLElement;
  private readonly refreshAfterMorphBound = this.refreshAfterMorph.bind(this);

  connect() {
    this.cleanupFn = combine(
      this.registerDraggable(),
      this.registerDropTarget(),
      this.registerTurboMorphRefresh(),
    );
  }

  disconnect() {
    this.cleanupFn?.();
    this.cleanupFn = undefined;
  }

  private renderDropIndicator(edge:Edge|null) {
    const currentEdge = this.dropIndicatorElement?.dataset.dropPosition;
    const currentOwner = this.dropIndicatorElement?.dataset.dropPositionOwner;
    const nextIndicator = edge ? this.resolveDropIndicator(edge) : null;

    if (
      currentOwner === this.itemIdValue &&
      nextIndicator &&
      this.dropIndicatorElement === nextIndicator.element &&
      currentEdge === nextIndicator.edge
    ) {
      return;
    }

    this.clearDropIndicator();

    if (nextIndicator) {
      this.dropIndicatorElement = nextIndicator.element;
      nextIndicator.element.dataset.dropPosition = nextIndicator.edge;
      nextIndicator.element.dataset.dropPositionOwner = this.itemIdValue;
    }
  }

  private clearDropIndicator() {
    if (!this.dropIndicatorElement) {
      return;
    }

    if (this.dropIndicatorElement.dataset.dropPositionOwner === this.itemIdValue) {
      delete this.dropIndicatorElement.dataset.dropPosition;
      delete this.dropIndicatorElement.dataset.dropPositionOwner;
    }

    this.dropIndicatorElement = undefined;
  }

  private resolveDropIndicator(edge:Edge):{ element:HTMLElement; edge:Edge } {
    if (edge !== 'bottom') {
      return { element: this.element, edge };
    }

    const nextItem = this.element.nextElementSibling;

    if (
      nextItem instanceof HTMLElement &&
      nextItem.matches(itemSelector) &&
      !nextItem.hasAttribute('data-dragging')
    ) {
      return { element: nextItem, edge: 'top' };
    }

    return { element: this.element, edge };
  }

  private getItemData():ItemData {
    return itemData(this.itemIdValue);
  }

  private registerDraggable():CleanupFn {
    return draggable({
      element: this.element,
      getInitialData: () => this.getItemData(),
      onDragStart: () => {
        preventUnhandled.start();
        this.element.setAttribute('data-dragging', 'source');
      },
      onDrop: () => {
        preventUnhandled.stop();
        this.clearDropIndicator();
        this.element.removeAttribute('data-dragging');
      },
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => this.renderPreview(container),
        });
      },
    });
  }

  private renderPreview(container:HTMLElement) {
    const previewWidth = this.previewTarget.getBoundingClientRect().width;
    const preview = this.previewTarget.cloneNode(true) as HTMLElement;

    this.sanitizePreview(preview);
    preview.setAttribute('data-preview', '');

    if (previewWidth > 0) {
      preview.style.width = `${previewWidth}px`;
    }

    container.append(preview);
  }

  private sanitizePreview(element:HTMLElement) {
    const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];

    for (const node of nodes) {
      node.removeAttribute('data-controller');
      node.removeAttribute('data-action');
      node.removeAttribute('data-dragging');
      node.removeAttribute('data-drop-position');
      node.removeAttribute('data-drop-position-owner');

      for (const attribute of Array.from(node.attributes)) {
        if (/^data-.+--.+-target$/.test(attribute.name)) {
          node.removeAttribute(attribute.name);
        }
      }
    }
  }

  private registerDropTarget():CleanupFn {
    return dropTargetForElements({
      element: this.element,
      canDrop: ({ source }) => {
        return isItemData(source.data) && source.data.itemId !== this.itemIdValue;
      },
      getData: ({ input }) => {
        return attachClosestEdge(this.getItemData(), {
          element: this.element,
          input,
          allowedEdges: ['top', 'bottom'],
        });
      },
      getIsSticky: () => true,
      onDragEnter: ({ self }) => {
        const closestEdge = extractClosestEdge(self.data);
        this.renderDropIndicator(closestEdge);
      },
      onDrag: ({ self }) => {
        const closestEdge = extractClosestEdge(self.data);
        this.renderDropIndicator(closestEdge);
      },
      onDragLeave: () => {
        this.clearDropIndicator();
      },
      onDrop: () => {
        this.clearDropIndicator();
      },
    });
  }

  private registerTurboMorphRefresh():CleanupFn {
    document.addEventListener('turbo:morph-element', this.refreshAfterMorphBound);

    return () => {
      document.removeEventListener('turbo:morph-element', this.refreshAfterMorphBound);
    };
  }

  private refreshAfterMorph(event:Event) {
    if (event.target !== this.element) {
      return;
    }

    this.disconnect();
    this.connect();
  }
}
