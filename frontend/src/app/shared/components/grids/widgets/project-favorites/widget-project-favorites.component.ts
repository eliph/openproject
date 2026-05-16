import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  ViewEncapsulation,
} from '@angular/core';
import { AbstractTurboWidgetComponent } from 'core-app/shared/components/grids/widgets/abstract-turbo-widget.component';

@Component({
  selector: 'op-project-favorites-widget',
  templateUrl: './widget-project-favorites.component.html',
  styleUrls: ['./widget-project-favorites.component.sass'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class WidgetProjectFavoritesComponent extends AbstractTurboWidgetComponent {
  @HostBinding('class.op-widget-project-favorites') className = true;

  override frameId = 'grids-widgets-project-favorites';
  override name = 'project_favorites';
}
