# frozen_string_literal: true

#-- copyright
# OpenProject is an open source project management software.
# Copyright (C) the OpenProject GmbH
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See COPYRIGHT and LICENSE files for more details.
#++

module Backlogs
  class WorkPackageCardListItemComponent < OpenProject::Common::BorderBoxListComponent::WorkPackageItem
    def card
      @card ||= WorkPackageCardComponent.new(
        work_package:,
        menu_src:,
        **card_arguments
      )
    end

    private

    def draggable?
      current_user.allowed_in_project?(:manage_sprint_items, project)
    end

    def split_url
      url_helpers.project_backlogs_backlog_details_path(project, work_package, params)
    end

    def full_url
      url_helpers.work_package_path(work_package)
    end

    # Sprint is the only positive match; bucket and inbox both fall through to
    # inbox routes.
    def uses_inbox_routes?
      !container.is_a?(Sprint)
    end

    def drop_url
      if uses_inbox_routes?
        url_helpers.move_project_backlogs_inbox_path(project, work_package, params)
      else
        url_helpers.move_project_backlogs_work_package_path(
          project,
          container,
          work_package,
          params
        )
      end
    end

    def menu_src
      if uses_inbox_routes?
        url_helpers.menu_project_backlogs_inbox_path(project, work_package, params)
      else
        url_helpers.menu_project_backlogs_work_package_path(
          project,
          container,
          work_package,
          params
        )
      end
    end

    def card_arguments
      {
        classes: "op-backlogs-story",
        data: card_data
      }
    end

    def card_data
      data = {
        story: true,
        controller: "backlogs--story",
        backlogs__story_id_value: work_package.id,
        backlogs__story_display_id_value: work_package.display_id,
        backlogs__story_split_url_value: split_url,
        backlogs__story_full_url_value: full_url,
        backlogs__story_selected_class: "Box-row--blue"
      }

      return data unless draggable?

      data.merge(backlogs__item_target: "preview")
    end

    public

    def row_args
      super.tap do |arguments|
        arguments[:draggable] = true if draggable?
      end
    end

    def row_data
      return {} unless draggable?

      {
        controller: "backlogs--item",
        backlogs__item_item_id_value: work_package.id,
        drop_url:
      }
    end
  end
end
