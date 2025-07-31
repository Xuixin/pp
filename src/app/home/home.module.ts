import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { PicoComponent } from '../modals/pico/pico.component';
import { PicoPupComponent } from '../modals/pico-pup/pico-pup.component';
import { CaptureScanComponent } from '../modals/capture-scan/capture-scan.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule],
  declarations: [HomePage, PicoComponent, PicoPupComponent, CaptureScanComponent],
})
export class HomePageModule {}
