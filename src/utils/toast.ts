import { toastController } from '@ionic/vue';

export type ToastColor = 'success' | 'warning' | 'danger' | 'primary' | 'medium';

export async function presentToast(
  message: string,
  color: ToastColor = 'success',
  duration = 2600,
) {
  const created = await toastController.create({
    message,
    duration,
    color,
    position: 'top',
  });
  await created.present();
  return created;
}

export const toast = {
  success: (message: string, duration = 2600) => presentToast(message, 'success', duration),
  error: (message: string, duration = 2600) => presentToast(message, 'danger', duration),
  warning: (message: string, duration = 2600) => presentToast(message, 'warning', duration),
};
