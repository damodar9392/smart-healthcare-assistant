import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../EmptyState';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const TYPE_LABELS = {
  appointment: 'Appointment',
  remedy: 'Guidance',
  review: 'Review',
  system: 'System',
  admin: 'Admin',
};

const NotificationsSection = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getNotifications();
      setNotifications(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (notification) => {
    if (notification.read) return;
    setNotifications((prev) =>
      prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
    );
    try {
      await patientService.markNotificationRead(notification._id);
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    try {
      await patientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark notifications as read.');
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await patientService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete notification.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="section-head">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-sm btn-outline" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          hint="Appointment updates and reminders will appear here."
        />
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div
              className={`notification-item${notification.read ? '' : ' unread'}`}
              key={notification._id}
              onClick={() => markRead(notification)}
            >
              <div className="notification-head">
                <span className={`badge badge-${notification.type}`}>
                  {TYPE_LABELS[notification.type] || notification.type}
                </span>
                <span className="muted">{formatDate(notification.createdAt)}</span>
                {!notification.read && <span className="unread-dot" />}
              </div>
              <strong>{notification.title}</strong>
              <p className="muted">{notification.message}</p>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(notification._id);
                }}
                disabled={busyId === notification._id}
              >
                {busyId === notification._id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;