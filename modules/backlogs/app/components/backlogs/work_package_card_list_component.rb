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
  class WorkPackageCardListComponent < ApplicationComponent
    include Primer::AttributesHelper
    include OpPrimer::ComponentHelpers

    delegate :with_empty_state, :with_footer, :empty_state?, to: :@list

    attr_reader :work_packages,
                :project,
                :container,
                :drag_and_drop,
                :params,
                :current_user

    def initialize(
      project:,
      container:,
      work_packages: nil,
      drag_and_drop: nil,
      params: {},
      current_user: User.current,
      **system_arguments
    )
      super()

      @work_packages = work_packages || []
      @project = project
      @container = container
      @drag_and_drop = drag_and_drop
      @params = params
      @current_user = current_user

      @system_arguments = system_arguments
      @system_arguments[:padding] = :condensed
      merge_drag_and_drop_data! if drag_and_drop

      @list = OpenProject::Common::BorderBoxListComponent.new(
        container:,
        current_user:,
        **@system_arguments
      )
    end

    def with_header(title:, **system_arguments, &)
      count = work_packages.size

      @list.with_header(
        title:,
        count:,
        count_label: I18n.t(:label_x_work_packages, count:),
        collapsed: folded?,
        **system_arguments,
        &
      )
    end

    def before_render
      content
      populate_list!
      validate_empty_state!
    end

    def call
      render(@list)
    end

    private

    def merge_drag_and_drop_data!
      @system_arguments[:data] = merge_data(
        {
          data: drag_and_drop_data
        },
        @system_arguments
      )
    end

    def drag_and_drop_data
      {
        backlogs_target: "list",
        backlogs_target_id: drag_and_drop.fetch(:target_id)
      }
    end

    def folded?
      current_user.pref[:backlogs_versions_default_fold_state] == "closed"
    end

    def populate_list!
      return if work_packages.empty?

      work_packages.each do |work_package|
        @list.with_work_package_item(
          work_package:,
          project:,
          params:,
          component_klass: Backlogs::WorkPackageCardListItemComponent
        )
      end
    end

    def validate_empty_state!
      return unless work_packages.empty? && !empty_state?

      raise ArgumentError, "empty_state slot is required when no work package items are rendered"
    end
  end
end
