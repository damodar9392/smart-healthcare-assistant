import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '../services/doctorService';

const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getAppointments();
      setAppointments(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (appointment, status) => {
    await doctorService.updateStatus(appointment._id, status);
    setMessage(`Appointment marked as ${status}.`);
    load();
  };

  return { appointments, loading, error, message, setMessage, updateStatus, reload: load };
};

export default useAppointments;