import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Components
import { NotificationModalComponent } from './components/notification-modal/notification-modal.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ScrollToTopComponent } from './components/scroll-to-top/scroll-to-top.component';

@NgModule({
  declarations: [
    NotificationModalComponent,
    NotFoundComponent,
    ScrollToTopComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NotificationModalComponent,
    NotFoundComponent,
    ScrollToTopComponent
  ]
})
export class SharedModule { }
