import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  duration?: number; // in milliseconds
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<NotificationData | null>(
    null
  );
  private showSubject = new BehaviorSubject<boolean>(false);

  public notification$ = this.notificationSubject.asObservable();
  public show$ = this.showSubject.asObservable();

  constructor() {}

  // Show success notification
  showSuccess(
    title: string,
    message: string,
    autoClose: boolean = true,
    duration: number = 3000
  ) {
    this.showNotification({
      type: 'success',
      title,
      message,
      autoClose,
      duration,
    });
  }

  // Show error notification
  showError(
    title: string,
    message: string,
    autoClose: boolean = true,
    duration: number = 5000
  ) {
    this.showNotification({
      type: 'error',
      title,
      message,
      autoClose,
      duration,
    });
  }

  // Show warning notification
  showWarning(
    title: string,
    message: string,
    autoClose: boolean = true,
    duration: number = 4000
  ) {
    this.showNotification({
      type: 'warning',
      title,
      message,
      autoClose,
      duration,
    });
  }

  // Show info notification
  showInfo(
    title: string,
    message: string,
    autoClose: boolean = true,
    duration: number = 3000
  ) {
    this.showNotification({
      type: 'info',
      title,
      message,
      autoClose,
      duration,
    });
  }

  // Generic show notification method
  private showNotification(notification: NotificationData) {
    console.log(
      `📢 Service: Showing notification at`,
      new Date().toLocaleTimeString(),
      notification
    );
    this.notificationSubject.next(notification);
    this.showSubject.next(true);
  }

  // Hide notification
  hide() {
    console.log(
      `🔇 Service: Hiding notification at`,
      new Date().toLocaleTimeString()
    );
    this.showSubject.next(false);
    // Clear notification data after animation
    setTimeout(() => {
      this.notificationSubject.next(null);
    }, 300);
  }

  // Get current notification
  getCurrentNotification(): NotificationData | null {
    return this.notificationSubject.value;
  }

  // Check if notification is currently shown
  isShown(): boolean {
    return this.showSubject.value;
  }
}
