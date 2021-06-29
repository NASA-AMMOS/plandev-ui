import {
  ChangeDetectionStrategy,
  Component,
  NgModule,
  OnInit,
} from '@angular/core';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'not-found',
  styleUrls: ['./not-found.component.css'],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent implements OnInit {
  comics = [
    { id: '927', name: 'standards' },
    { id: '1091', name: 'curiosity' },
    { id: '1356', name: 'orbital_mechanics' },
    { id: '1504', name: 'opportunity' },
    { id: '1536', name: 'the_martian' },
    { id: '1583', name: 'nasa_press_conference' },
    { id: '1825', name: '7_eleven' },
    { id: '2111', name: 'opportunity_rover' },
    { id: '2124', name: 'space_mission_hearing' },
  ];
  comicImg = '';
  xkcdUrl = '';

  ngOnInit() {
    const { id, name } =
      this.comics[Math.floor(Math.random() * this.comics.length)];
    this.comicImg = `assets/comics/${name}.png`;
    this.xkcdUrl = `https://xkcd.com/${id}/`;
  }
}

@NgModule({
  declarations: [NotFoundComponent],
  exports: [NotFoundComponent],
  imports: [MaterialModule],
})
export class NotFoundModule {}
