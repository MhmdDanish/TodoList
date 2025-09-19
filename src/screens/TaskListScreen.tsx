import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import { useTasks } from '../hooks/useTasks';
import { useSync } from '../hooks/useSync';
import { TaskList } from '../components/TaskList';
import { TaskEditor } from '../components/TaskEditor';
import { SyncStatus } from '../components/SyncStatus';
import { Task, TaskFilter, CreateTaskInput } from '../types/Task';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
const { height, width } = Dimensions.get("window");

import { APIService } from '../services/apiService';

interface TaskListScreenProps {
  onTaskSelect: (task: Task) => void;
}

export function TaskListScreen({ onTaskSelect }: TaskListScreenProps) {
  const {
    tasks,
    loading,
    error,
    currentFilter,
    stats,
    createTask,
    toggleComplete,
    setFilter,
    clearError,
    refresh,
  } = useTasks();

  const { isSyncing } = useSync();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      await createTask(input);
      setShowCreateModal(false);
    } catch (error) {
    }
  };

  const handleTaskPress = (task: Task) => {
    onTaskSelect(task);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await toggleComplete(task);
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const renderFilterButton = (filter: TaskFilter, label: string, count: number) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        currentFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        currentFilter === filter && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Status */}
      <SyncStatus />

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', stats.total)}
        {renderFilterButton('pending', 'Pending', stats.pending)}
        {renderFilterButton('completed', 'Done', stats.completed)}
      </View>

      {/* Task List */}
      <TaskList
        tasks={tasks}
        loading={loading}
        filter={currentFilter}
        onTaskPress={handleTaskPress}
        onToggleComplete={handleToggleComplete}
        onRefresh={refresh}
        refreshing={isSyncing}
      />

      {/* Create Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Task</Text>
          </View>
          <TouchableOpacity
            style={{ padding: 20, backgroundColor: 'blue', margin: 10 }}
            onPress={() => {
              const mockData = APIService.debugMockData();
              console.log('Mock data returned:', mockData);
            }}
          >
            <Text style={{ color: 'white' }}>DEBUG: Show Mock Data</Text>
          </TouchableOpacity>
          <TaskEditor
            onSave={handleCreateTask}
            onCancel={() => setShowCreateModal(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: height * 0.05,
  },
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.medium,
    flex: 1,
  },
  errorDismiss: {
    color: COLORS.background,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
});