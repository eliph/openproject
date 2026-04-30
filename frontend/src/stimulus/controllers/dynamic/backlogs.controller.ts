//-- copyright
// OpenProject is an open source project management software.
// Copyright (C) the OpenProject GmbH
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See COPYRIGHT and LICENSE files for more details.
//++

import { Controller } from '@hotwired/stimulus';
import { FetchRequest } from '@rails/request.js';
import {
  dropTargetForElements,
  type ElementEventPayloadMap,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { debugLog } from 'core-app/shared/helpers/debug_output';

import {
  buildMoveFormData,
  isItemData,
  resolveFallbackDropTarget,
  resolveListPreviousItemId,
  resolveListTargetId,
  resolvePreviousItemId,
} from './backlogs/drag-and-drop';

type CleanupFn = () => void;
type ElementDropPayload = ElementEventPayloadMap['onDrop'];

export default class BacklogsController extends Controller<HTMLElement> {
  static targets = ['list'];

  declare readonly listTargets:HTMLElement[];

  private cleanupFn?:CleanupFn;
  private listCleanupFns = new Map<HTMLElement, CleanupFn>();

  connect():void {
    this.cleanupFn = monitorForElements({
      canMonitor: ({ source }) => isItemData(source.data),
      onDrop: (args) => {
        void this.handleDrop(args);
      },
    });
  }

  disconnect():void {
    this.cleanupFn?.();
    this.cleanupFn = undefined;
    this.listCleanupFns.forEach((cleanup) => cleanup());
    this.listCleanupFns.clear();
  }

  listTargetConnected(element:HTMLElement):void {
    const cleanup = dropTargetForElements({
      element,
      canDrop: ({ source }) => isItemData(source.data),
      getData: () => ({ type: 'list', targetId: resolveListTargetId(element) }),
      getIsSticky: () => false,
    });

    this.listCleanupFns.set(element, cleanup);
  }

  listTargetDisconnected(element:HTMLElement):void {
    this.listCleanupFns.get(element)?.();
    this.listCleanupFns.delete(element);
  }

  private async handleDrop({ location, source }:ElementDropPayload) {
    if (!isItemData(source.data) || !(source.element instanceof HTMLElement)) {
      return;
    }

    const dropUrl = source.element.getAttribute('data-drop-url');
    if (!dropUrl) {
      return;
    }

    const targetItem = location.current.dropTargets.find(({ data, element }) => (
      isItemData(data) && element instanceof HTMLElement
    ));
    const fallbackTarget = location.current.dropTargets.length === 0
      ? resolveFallbackDropTarget({
        input: location.current.input,
        root: this.element,
        sourceElement: source.element,
      })
      : null;
    const fallbackItem = fallbackTarget?.isItem ? fallbackTarget : null;
    const resolvedTargetItem = targetItem ?? fallbackItem;
    const targetElement = resolvedTargetItem?.element ?? location.current.dropTargets[0]?.element ?? fallbackTarget?.element;

    if (!(targetElement instanceof HTMLElement)) {
      return;
    }

    const targetId = resolveListTargetId(targetElement);
    if (!targetId) {
      return;
    }

    const previousItemId = resolvedTargetItem?.element instanceof HTMLElement
      ? resolvePreviousItemId({
        sourceItemId: source.data.itemId,
        targetItem: resolvedTargetItem.element,
        closestEdge: extractClosestEdge(resolvedTargetItem.data),
      })
      : resolveListPreviousItemId({
        sourceItemId: source.data.itemId,
        list: targetElement,
      });

    const request = new FetchRequest(
      'put',
      dropUrl,
      {
        body: buildMoveFormData({ targetId, previousItemId }),
        responseKind: 'turbo-stream',
      },
    );

    try {
      const response = await request.perform();

      if (!response.ok) {
        debugLog(`Failed to move backlogs item: ${response.statusCode}`);
      }
    } catch (error) {
      debugLog('Failed to move backlogs item due to request error', error);
    }
  }
}
