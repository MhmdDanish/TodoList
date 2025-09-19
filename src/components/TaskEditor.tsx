import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/Task';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

interface TaskEditorProps {
  task?: Task;
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export function TaskEditor({ task, onSave, onCancel, onDelete }: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueAt ? new Date(task.dueAt) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditing = !!task;
  const isValid = title.trim().length > 0;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        setDueDate(endOfDay);
      }
    } else {
      // iOS - update temp date
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIOSDateConfirm = () => {
    const endOfDay = new Date(tempDate);
    endOfDay.setHours(23, 59, 59, 999);
    setDueDate(endOfDay);
    setShowDatePicker(false);
  };

  const handleIOSDateCancel = () => {
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      setTempDate(dueDate || new Date());
    }
    setShowDatePicker(true);
  };

  const clearDueDate = () => {
    setDueDate(undefined);
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSave = async () => {
    if (!isValid || saving) return;

    setSaving(true);
    try {
      const input = isEditing 
        ? {
            id: task.id,
            title: title.trim(),
            notes: notes.trim() || undefined,
            dueAt: dueDate?.toISOString(),
          } as UpdateTaskInput
        : {
            title: title.trim(),
            notes: notes.trim() || undefined,
            dueAt: dueDate?.toISOString(),
          } as CreateTaskInput;

      await onSave(input);
    } catch (error) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete || deleting) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task. Please try again.');
              console.error('Delete error:', error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, !isValid && styles.inputError]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor={COLORS.gray}
            maxLength={200}
            autoFocus={!isEditing}
          />
          {!isValid && (
            <Text style={styles.errorText}>Title is required</Text>
          )}
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (optional)"
            placeholderTextColor={COLORS.gray}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Due Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Due Date</Text>
          
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={openDatePicker}
          >
            {dueDate ? (
              <View style={styles.dateContainer}>
                <View style={styles.dateContent}>
                  <Text style={styles.dateText}>
                    {formatDateForDisplay(dueDate)}
                  </Text>
                  <Text style={styles.dateSubtext}>
                    {dueDate.toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={clearDueDate}
                >
                  <Text style={styles.clearDateText}>×</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>
                  Select due date (optional)
                </Text>
                <Text style={styles.placeholderSubtext}>
                  Tap to open calendar
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Task Status (for editing) */}
        {isEditing && (
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={[
              styles.statusBadge,
              task.isDone ? styles.statusComplete : styles.statusPending
            ]}>
              <Text style={[
                styles.statusText,
                task.isDone ? styles.statusCompleteText : styles.statusPendingText
              ]}>
                {task.isDone ? '✓ Completed' : '○ Pending'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
          disabled={saving || deleting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button, 
            styles.saveButton,
            (!isValid || saving) && styles.buttonDisabled
          ]} 
          onPress={handleSave}
          disabled={!isValid || saving || deleting}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delete Button (for editing only) */}
      {isEditing && onDelete && (
        <View style={styles.dangerZone}>
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]} 
            onPress={handleDelete}
            disabled={saving || deleting}
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting...' : 'Delete Task'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleIOSDateCancel}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleIOSDateConfirm}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="compact"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  form: {
    padding: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    minHeight: 60,
    justifyContent: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContent: {
    flex: 1,
  },
  dateText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: '600',
  },
  dateSubtext: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  clearDateButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  clearDateText: {
    fontSize: 18,
    color: COLORS.gray,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    alignItems: 'flex-start',
  },
  placeholderText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.gray,
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: FONT_SIZES.small,
    color: COLORS.gray,
    marginTop: 2,
    opacity: 0.8,
  },
  // iOS Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  datePickerCancel: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.gray,
    fontWeight: '500',
  },
  datePickerTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
  },
  datePickerDone: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusComplete: {
    backgroundColor: COLORS.success + '20',
  },
  statusPending: {
    backgroundColor: COLORS.warning + '20',
  },
  statusText: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  statusCompleteText: {
    color: COLORS.success,
  },
  statusPendingText: {
    color: COLORS.warning,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dangerZone: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: COLORS.background,
  },
});