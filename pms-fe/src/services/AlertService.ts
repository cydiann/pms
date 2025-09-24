import { useEffect, useState } from 'react';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

export interface AlertPayload {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

type Listener = (payload: AlertPayload | null) => void;

class AlertServiceImpl {
  private listeners = new Set<Listener>();

  show(payload: AlertPayload): void {
    this.listeners.forEach(l => l(payload));
  }

  hide(): void {
    this.listeners.forEach(l => l(null));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const AlertService = new AlertServiceImpl();

// Convenience hook for components that want current alert
export function useAlertPayload(): AlertPayload | null {
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  useEffect(() => AlertService.subscribe(setPayload), []);
  return payload;
}

export default AlertService;

