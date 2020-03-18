import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  NgModule,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Version } from '../../../environments/version';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
})
export class AboutDialogComponent {
  branch: string;
  commit: string;
  commitUrl: string;
  copyright: string[];
  date: string;
  name: string;

  constructor(
    public dialogRef: MatDialogRef<AboutDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: Version,
  ) {
    this.branch = data.branch;
    this.commit = data.commit;
    this.commitUrl = `https://github.jpl.nasa.gov/MPS/aerie-ui/commit/${data.commit}`;
    this.copyright = [
      `Copyright ${new Date().getFullYear()}, by the California Institute of Technology.`,
      `ALL RIGHTS RESERVED.`,
      `United States Government sponsorship acknowledged.`,
      `Any commercial use must be negotiated with the Office of Technology Transfer at the California Institute of Technology.`,
    ];
    this.date = data.date;
    this.name = data.name;
  }
}

@NgModule({
  declarations: [AboutDialogComponent],
  entryComponents: [AboutDialogComponent],
  exports: [AboutDialogComponent],
  imports: [CommonModule, MaterialModule],
})
export class AboutDialogModule {}
