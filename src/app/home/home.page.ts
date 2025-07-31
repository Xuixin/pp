import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PicoComponent } from '../modals/pico/pico.component';
import { PicoPupComponent } from '../modals/pico-pup/pico-pup.component';
import { CaptureScanComponent } from '../modals/capture-scan/capture-scan.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  constructor(private modalCtrl: ModalController) {}

  async openModal() {
    const modal = await this.modalCtrl.create({
      component: PicoComponent,
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  async openModalpup() {
    const modal = await this.modalCtrl.create({
      component: PicoPupComponent,
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  async openScanCap() {
    const modal = await this.modalCtrl.create({
      component: CaptureScanComponent,
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }
}
