import { alertController } from '@ionic/vue';

/**
 * Prompt for a COA audit justification. Returns null if cancelled.
 */
export async function promptAuditRemarks(options: {
  header: string;
  message?: string;
  required?: boolean;
}): Promise<string | null> {
  return new Promise(async (resolve) => {
    let settled = false;
    const alert = await alertController.create({
      header: options.header,
      message: options.message
        ?? 'Enter a justification for this action. It will be stored in the audit trail.',
      inputs: [{
        name: 'audit_remarks',
        type: 'textarea',
        placeholder: 'Justification (required)',
        attributes: { maxlength: 1000 },
      }],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            settled = true;
            resolve(null);
          },
        },
        {
          text: 'Continue',
          handler: (data) => {
            const text = String(data?.audit_remarks || '').trim();
            if (options.required !== false && !text) {
              return false;
            }
            settled = true;
            resolve(text);
          },
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (!settled && (role === 'backdrop' || role === 'gesture' || role === 'cancel')) {
      resolve(null);
    }
  });
}
