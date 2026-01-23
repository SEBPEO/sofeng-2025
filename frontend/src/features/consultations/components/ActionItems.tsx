import React, { useState, useEffect } from 'react';
import {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  type ConsultationActionItem,
} from '../api';
import { Button } from '@/components';
import styles from './ActionItems.module.css';

interface ActionItemsProps {
  consultationId: number;
  isDoctor: boolean;
}

export const ActionItems: React.FC<ActionItemsProps> = ({ consultationId, isDoctor }) => {
  const [actionItems, setActionItems] = useState<ConsultationActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    loadActionItems();
  }, [consultationId]);

  const loadActionItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getActionItems(consultationId);
      setActionItems(items);
    } catch (err: any) {
      console.error('Failed to load action items:', err);
      setError(err?.response?.data?.message || 'Failed to load action items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemDescription.trim()) return;

    try {
      setError(null);
      const newItem = await createActionItem(consultationId, newItemDescription.trim());
      setActionItems([...actionItems, newItem]);
      setNewItemDescription('');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Failed to create action item:', err);
      setError(err?.response?.data?.message || 'Failed to create action item');
    }
  };

  const handleToggleComplete = async (item: ConsultationActionItem) => {
    try {
      setError(null);
      const updated = await updateActionItem(consultationId, item.action_item_id, {
        is_completed: !item.is_completed,
      });
      setActionItems(actionItems.map((i) => (i.action_item_id === item.action_item_id ? updated : i)));
    } catch (err: any) {
      console.error('Failed to update action item:', err);
      setError(err?.response?.data?.message || 'Failed to update action item');
    }
  };

  const handleStartEdit = (item: ConsultationActionItem) => {
    setEditingId(item.action_item_id);
    setEditingText(item.description);
  };

  const handleSaveEdit = async (itemId: number) => {
    try {
      setError(null);
      const updated = await updateActionItem(consultationId, itemId, {
        description: editingText.trim(),
      });
      setActionItems(actionItems.map((i) => (i.action_item_id === itemId ? updated : i)));
      setEditingId(null);
      setEditingText('');
    } catch (err: any) {
      console.error('Failed to update action item:', err);
      setError(err?.response?.data?.message || 'Failed to update action item');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this action item?')) return;

    try {
      setError(null);
      await deleteActionItem(consultationId, itemId);
      setActionItems(actionItems.filter((i) => i.action_item_id !== itemId));
    } catch (err: any) {
      console.error('Failed to delete action item:', err);
      setError(err?.response?.data?.message || 'Failed to delete action item');
    }
  };

  return (
    <div className={styles.actionItemsContainer}>
      <div className={styles.header}>
        <h3>Treatment Plan & Instructions</h3>
        {isDoctor && !isAdding && (
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            + Add Item
          </Button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isDoctor && isAdding && (
        <div className={styles.addItemForm}>
          <textarea
            className={styles.descriptionInput}
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Enter action item (e.g., Take medication 3 times a day for 5 days)"
            rows={2}
          />
          <div className={styles.formActions}>
            <Button variant="primary" onClick={handleAddItem} disabled={!newItemDescription.trim()}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => {
              setIsAdding(false);
              setNewItemDescription('');
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading action items...</div>
      ) : actionItems.length === 0 ? (
        <div className={styles.empty}>
          {isDoctor ? 'No action items yet. Add one to get started.' : 'No action items assigned.'}
        </div>
      ) : (
        <ul className={styles.actionItemsList}>
          {actionItems.map((item) => (
            <li
              key={item.action_item_id}
              className={`${styles.actionItem} ${item.is_completed ? styles.completed : ''}`}
            >
              <div className={styles.itemContent}>
                {isDoctor && editingId === item.action_item_id ? (
                  <div className={styles.editForm}>
                    <textarea
                      className={styles.descriptionInput}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                    />
                    <div className={styles.formActions}>
                      <Button variant="primary" onClick={() => handleSaveEdit(item.action_item_id)}>
                        Save
                      </Button>
                      <Button variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.itemHeader}>
                      {!isDoctor && (
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => handleToggleComplete(item)}
                          className={styles.checkbox}
                          disabled={loading}
                        />
                      )}
                      {isDoctor && (
                        <div className={styles.statusIndicator}>
                          {item.is_completed ? (
                            <span className={styles.completedStatus}>✓ Completed</span>
                          ) : (
                            <span className={styles.pendingStatus}>○ Pending</span>
                          )}
                        </div>
                      )}
                      <span className={styles.itemDescription}>{item.description}</span>
                    </div>
                    {isDoctor && (
                      <div className={styles.itemActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => handleStartEdit(item)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteItem(item.action_item_id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
