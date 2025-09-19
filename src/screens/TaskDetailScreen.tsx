import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import { useTasks } from '../hooks/useTasks';
import { TaskEditor } from '../components/TaskEditor';
import { Task, UpdateTaskInput } from '../types/Task';
import { formatDateTime, formatDueDate, isOverdue } from '../utils/dateUtils';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

const { height, width } = Dimensions.get("window");

interface TaskDetailScreenProps {
  task: Task;
  onBack: () => void;
}

export function TaskDetailScreen({ task, onBack }: TaskDetailScreenProps) {
  const { updateTask, deleteTask, toggleComplete } = useTasks();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleUpdate = async (input: UpdateTaskInput) => {
    try {
      await updateTask(input);
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      onBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
    }
  };

  const handleToggleComplete = async () => {
    try {
      await toggleComplete(task);
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const overdue = task.dueAt && !task.isDone && isOverdue(task.dueAt);
  const dueSoon = task.dueAt && !task.isDone && 
    new Date(task.dueAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <SafeAreaView style={styles.container}>
      {/* Beautiful Header with Glass Effect */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setShowEditModal(true)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Elegant Status Section */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusBadge, 
            task.isDone ? styles.statusComplete : styles.statusPending
          ]}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusEmoji}>
                {task.isDone ? '✓' : '○'}
              </Text>
            </View>
            <Text style={[
              styles.statusText,
              task.isDone ? styles.statusCompleteText : styles.statusPendingText
            ]}>
              {task.isDone ? 'Completed' : 'In Progress'}
            </Text>
          </View>
          
          {task.dirty && (
            <View style={styles.unsyncedIndicator}>
              <View style={styles.unsyncedDot} />
              <Text style={styles.unsyncedText}>Unsynced changes</Text>
            </View>
          )}
        </View>

        {/* Beautiful Title Section */}
        <View style={styles.titleSection}>
          <Text style={[
            styles.title,
            task.isDone && styles.completedTitle
          ]}>
            {task.title}
          </Text>
        </View>

        {/* Content Cards */}
        <View style={styles.cardsContainer}>
          {/* Notes Card */}
          {task.notes && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Notes</Text>
              </View>
              <Text style={[
                styles.cardContent,
                task.isDone && styles.completedText
              ]}>
                {task.notes}
              </Text>
            </View>
          )}

          {/* Due Date Card */}
          {task.dueAt && (
            <View style={[
              styles.card,
              overdue && styles.overdueCard,
              dueSoon && styles.dueSoonCard
            ]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Due Date</Text>
                {overdue && <Text style={styles.overdueIcon}>⚠️</Text>}
              </View>
              <Text style={[
                styles.dueDateText,
                overdue && styles.overdueText,
                dueSoon && styles.dueSoonText,
                task.isDone && styles.completedText
              ]}>
                {formatDueDate(task.dueAt)}
              </Text>
              <Text style={styles.dueDateSubtext}>
                {formatDateTime(task.dueAt)}
              </Text>
            </View>
          )}

          {/* Metadata Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Details</Text>
            </View>
            <View style={styles.metadataGrid}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Created</Text>
                <Text style={styles.metadataValue}>
                  {formatDateTime(task.createdAt)}
                </Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Last Updated</Text>
                <Text style={styles.metadataValue}>
                  {formatDateTime(task.updatedAt)}
                </Text>
              </View>

              {task.lastSyncAt && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Last Synced</Text>
                  <Text style={styles.metadataValue}>
                    {formatDateTime(task.lastSyncAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Beautiful Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            task.isDone ? styles.markPendingButton : styles.markCompleteButton
          ]}
          onPress={handleToggleComplete}
        >
          <Text style={styles.actionButtonText}>
            {task.isDone ? '↶ Mark as Pending' : '✓ Mark as Complete'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Task</Text>
          </View>
          <TaskEditor
            task={task}
            onSave={handleUpdate}
            onCancel={() => setShowEditModal(false)}
            onDelete={handleDelete}
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
    marginTop:height*0.05,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  backButtonText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.background,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  statusSection: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  statusComplete: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  statusPending: {
    backgroundColor: COLORS.warning + '15',
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  statusEmoji: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusCompleteText: {
    color: COLORS.success,
  },
  statusPendingText: {
    color: COLORS.warning,
  },
  unsyncedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.warning + '10',
    borderRadius: 15,
  },
  unsyncedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
    marginRight: SPACING.xs,
  },
  unsyncedText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.warning,
    fontWeight: '500',
  },
  titleSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 34,
    textAlign: 'center',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  cardsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    backgroundColor: COLORS.error + '05',
  },
  dueSoonCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    backgroundColor: COLORS.warning + '05',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContent: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 22,
  },
  dueDateText: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  dueDateSubtext: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  overdueText: {
    color: COLORS.error,
  },
  dueSoonText: {
    color: COLORS.warning,
  },
  overdueIcon: {
    fontSize: FONT_SIZES.medium,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metadataGrid: {
    gap: SPACING.md,
  },
  metadataItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  metadataLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    fontWeight: '400',
  },
  actionContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  markCompleteButton: {
    backgroundColor: COLORS.success,
  },
  markPendingButton: {
    backgroundColor: COLORS.gray,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.background,
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
});