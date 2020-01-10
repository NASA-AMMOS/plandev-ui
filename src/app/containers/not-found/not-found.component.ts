import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-not-found',
  styleUrls: ['./not-found.component.css'],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent implements OnInit {
  comics = [
    '7_eleven',
    'curiosity',
    'nasa_press_conference',
    'opportunity',
    'opportunity_rover',
    'orbital_mechanics',
    'spirit',
    'surface_area',
    'the_martian',
  ];
  comicUrl = '';
  xkcdUrl = 'https://imgs.xkcd.com/comics';

  ngOnInit() {
    const comic = this.comics[Math.floor(Math.random() * this.comics.length)];
    this.comicUrl = `${this.xkcdUrl}/${comic}.png`;
  }
}
