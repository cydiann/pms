import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertService, AlertPayload } from '../services/AlertService';

function GlobalAlert(): React.JSX.Element | null {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => AlertService.subscribe(setPayload), []);

  const visible = !!payload;

  const buttons = useMemo(() => {
    if (!payload?.buttons || payload.buttons.length === 0) {
      return [
        {
          text: 'OK',
          style: 'default' as const,
          onPress: () => setPayload(null),
        },
      ];
    }
    return payload.buttons;
  }, [payload]);

  if (!visible) return null;

  const primaryIndex = Math.max(
    0,
    buttons.findIndex(b => b.style !== 'cancel')
  );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setPayload(null)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!!payload?.title && <Text style={styles.title}>{payload.title}</Text>}
          {!!payload?.message && <Text style={styles.message}>{payload.message}</Text>}

          <View style={styles.actionsRow}>
            {buttons.map((btn, idx) => {
              const isPrimary = idx === primaryIndex && btn.style !== 'cancel';
              const isDestructive = btn.style === 'destructive';
              const style = [
                styles.button,
                isPrimary && styles.primaryButton,
                isDestructive && styles.destructiveButton,
              ];
              const textStyle = [
                styles.buttonText,
                (isPrimary || isDestructive) && styles.buttonTextPrimary,
              ];
              return (
                <TouchableOpacity
                  key={`${btn.text}-${idx}`}
                  style={style}
                  onPress={() => {
                    setPayload(null);
                    btn.onPress?.();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'left',
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  destructiveButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonTextPrimary: {
    color: '#fff',
  },
});

export default GlobalAlert;

