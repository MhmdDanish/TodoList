import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../types/Task';
import { formatDate, formatDueDate, isOverdue } from '../utils/dateUtils';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
}

export function TaskItem({ task, onPress, onToggleComplete }: TaskItemProps) {
  const isDueSoon = task.dueAt && !task.isDone && 
    new Date(task.dueAt).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours
  const overdue = task.dueAt && !task.isDone && isOverdue(task.dueAt);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {/* Checkbox */}
        <TouchableOpacity 
          style={[
            styles.checkbox, 
            task.isDone && styles.checkboxChecked
          ]} 
          onPress={onToggleComplete}
        >
          {task.isDone && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Task Content */}
        <View style={styles.taskContent}>
          <Text style={[
            styles.title,
            task.isDone && styles.completedText
          ]}>
            {task.title}
          </Text>
          
          {task.notes && (
            <Text style={[
              styles.notes,
              task.isDone && styles.completedText
            ]}>
              {task.notes}
            </Text>
          )}
          
          {/* Due Date */}
          {task.dueAt && (
            <Text style={[
              styles.dueDate,
              overdue && styles.overdue,
              isDueSoon && styles.dueSoon,
              task.isDone && styles.completedText
            ]}>
              {formatDueDate(task.dueAt)}
            </Text>
          )}
          
          {/* Created Date */}
          <Text style={[styles.createdDate, task.isDone && styles.completedText]}>
            Created {formatDate(task.createdAt)}
          </Text>
        </View>

        {/* Status Indicators */}
        <View style={styles.indicators}>
          {task.dirty && (
            <View style={styles.unsyncedIndicator}>
              <Text style={styles.unsyncedDot}>●</Text>
            </View>
          )}
          {overdue && (
            <Text style={styles.overdueIcon}>⚠️</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  notes: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  dueDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  dueSoon: {
    color: COLORS.warning,
    fontWeight: '500',
  },
  overdue: {
    color: COLORS.error,
    fontWeight: '600',
  },
  createdDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.gray,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  indicators: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: SPACING.sm,
  },
  unsyncedIndicator: {
    marginBottom: SPACING.xs,
  },
  unsyncedDot: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.small,
  },
  overdueIcon: {
    fontSize: FONT_SIZES.medium,
  },
});