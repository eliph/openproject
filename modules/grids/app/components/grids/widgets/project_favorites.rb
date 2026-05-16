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

module Grids
  module Widgets
    class ProjectFavorites < Grids::WidgetComponent
      include ProjectsHelper

      def title
        I18n.t("projects.lists.favorited")
      end

      def call
        widget_wrapper do |container|
          if favorite_projects.empty?
            render_empty_state(container)
          else
            render_project_rows(container)
            render_footer(container)
          end
        end
      end

      private

      def favorite_projects
        @favorite_projects ||= Project.visible.active.favorited_by(current_user).order(name: :asc).to_a
      end

      def render_blank_slate
        render(Primer::Beta::Blankslate.new(test_selector: "projects-widget-empty")) do |component|
          component.with_visual_icon(icon: :project)
          component.with_heading(tag: :h3).with_content(I18n.t("homescreen.additional.favorite_projects.no_results"))
          component.with_description { I18n.t("homescreen.additional.favorite_projects.no_results_subtext") }
        end
      end

      def render_empty_state(container)
        container.with_body(classes: "op-widget-project-favorites--empty") do
          render_blank_slate
        end
      end

      def render_project_rows(container)
        favorite_projects.each do |project|
          container.with_row do
            helpers.flex_layout do |row|
              row.with_column do
                render(
                  Primer::Beta::Octicon.new(
                    icon: "star-fill",
                    classes: "op-primer--star-icon",
                    "aria-label": I18n.t(:label_favorite)
                  )
                )
              end

              row.with_column(ml: 2) do
                render(
                  Primer::Beta::Link.new(
                    font_weight: :bold,
                    href: helpers.project_path(project),
                    title: short_project_description(project),
                    data: { "test-selector": "favorite-project" }
                  )
                ) { project.name }
              end
            end
          end
        end
      end

      def render_footer(container)
        container.with_footer do
          render(Primer::Beta::Link.new(href: helpers.projects_path)) { I18n.t(:label_project_view_all) }
        end
      end
    end
  end
end
