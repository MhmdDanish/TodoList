import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSync } from '../hooks/useSync';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

export function SyncStatus() {
  const { 
    statusText, 
    hasError, 
    isSyncing, 
    canSync, 
    isOnline, 
    sync, 
    clearError,
    unsyncedCount 
  } = useSync();

  const getStatusColor = () => {
    if (!isOnline) return COLORS.gray;
    if (hasError) return COLORS.error;
    if (isSyncing) return COLORS.warning;
    if (unsyncedCount > 0) return COLORS.warning;
    return COLORS.success;
  };

  const getStatusIcon = () => {
    if (!isOnline) return '⚫';
    if (hasError) return '❌';
    if (isSyncing) return '🔄';
    if (unsyncedCount > 0) return '📤';
    return '✅';
  };

  const handlePress = () => {
    if (hasError) {
      clearError();
    } else if (canSync) {
      sync().catch(console.error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={handlePress}
      disabled={isSyncing}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {statusText}
        </Text>
        {unsyncedCount > 0 && (
          <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.badgeText}>{unsyncedCount}</Text>
          </View>
        )}
      </View>
      {(hasError || canSync) && (
        <Text style={styles.actionHint}>
          {hasError ? 'Tap to retry' : 'Tap to sync'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: FONT_SIZES.medium,
    marginRight: SPACING.sm,
  },
  text: {
    fontSize: FONT_SIZES.small,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  badgeText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
  },
  actionHint: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});