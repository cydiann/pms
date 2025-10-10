import { Alert, Platform } from 'react-native';
import { AlertService } from '../services/AlertService';

/**
 * Cross-platform alert utility that works on web, iOS, Android, and Windows
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>,
  options?: any
) => {
  if (Platform.OS === 'web') {
    // Handle web platform
    if (!buttons || buttons.length === 0) {
      // Simple alert
      window.alert(message ? `${title}\n\n${message}` : title);
    } else if (buttons.length === 1) {
      // Single button alert
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons[0].onPress?.();
    } else if (buttons.length === 2) {
      // Confirm dialog (OK/Cancel style)
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const cancelButton = buttons.find(b => b.style === 'cancel');
      
      const result = window.confirm(message ? `${title}\n\n${message}` : title);
      if (result) {
        confirmButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    } else {
      // Multiple buttons - use prompt as fallback
      const buttonTexts = buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
      const promptMessage = message 
        ? `${title}\n\n${message}\n\nOptions:\n${buttonTexts}\n\nEnter number (1-${buttons.length}):`
        : `${title}\n\nOptions:\n${buttonTexts}\n\nEnter number (1-${buttons.length}):`;
      
      const choice = window.prompt(promptMessage);
      if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < buttons.length) {
          buttons[index].onPress?.();
        }
      }
    }
  } else {
    // Use custom styled global alert on native for better visuals
    AlertService.show({ title, message, buttons });
  }
};

/**
 * Cross-platform confirm dialog
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel',
  destructive: boolean = false
) => {
  showAlert(
    title,
    message,
    [
      {
        text: cancelText,
        onPress: onCancel,
        style: 'cancel',
      },
      {
        text: confirmText,
        onPress: onConfirm,
        style: destructive ? 'destructive' : 'default',
      },
    ]
  );
};

/**
 * Cross-platform simple alert (single OK button)
 */
export const showSimpleAlert = (
  title: string,
  message?: string,
  onDismiss?: () => void
) => {
  showAlert(
    title,
    message,
    onDismiss ? [{ text: 'OK', onPress: onDismiss }] : [{ text: 'OK' }]
  );
};

/**
 * Cross-platform error alert
 */
export const showError = (
  title: string = 'Error',
  message: string,
  onDismiss?: () => void
) => {
  showSimpleAlert(title, message, onDismiss);
};

/**
 * Cross-platform success alert
 */
export const showSuccess = (
  title: string = 'Success',
  message: string,
  onDismiss?: () => void
) => {
  showSimpleAlert(title, message, onDismiss);
};

/**
 * Platform-specific prompt (for web only, returns null on mobile)
 */
export const showPrompt = (
  title: string,
  message?: string,
  defaultValue?: string,
  onSubmit?: (value: string) => void,
  onCancel?: () => void
): void => {
  if (Platform.OS === 'web') {
    const result = window.prompt(message ? `${title}\n\n${message}` : title, defaultValue);
    if (result !== null) {
      onSubmit?.(result);
    } else {
      onCancel?.();
    }
  } else {
    // For mobile, you'd need to use a custom modal with TextInput
    // This is a limitation of React Native - no built-in prompt
    console.warn('Prompt is not available on mobile platforms. Use a custom modal instead.');
    onCancel?.();
  }
};
