import React from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Task, TaskFilter } from '../types/Task';
import { TaskItem } from './TaskItem';
import { LoadingSpinner } from './LoadingSpinner';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  filter: TaskFilter;
  onTaskPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function TaskList({ 
  tasks, 
  loading, 
  filter,
  onTaskPress, 
  onToggleComplete,
  onRefresh,
  refreshing = false,
}: TaskListProps) {
  
  const getEmptyMessage = () => {
    switch (filter) {
      case 'completed':
        return 'No completed tasks yet.\nComplete some tasks to see them here!';
      case 'pending':
        return 'No pending tasks.\nAll caught up! 🎉';
      default:
        return 'No tasks yet.\nTap the + button to create your first task!';
    }
  };

  if (loading && tasks.length === 0) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onPress={() => onTaskPress(item)}
          onToggleComplete={() => onToggleComplete(item)}
        />
      )}
      contentContainerStyle={[
        styles.container,
        tasks.length === 0 && styles.emptyContainer
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyMessage}>
            {getEmptyMessage()}
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});