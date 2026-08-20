import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';

const ROLES = ['patient', 'doctor', 'admin'];

const UsersSection = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (search) params.q = search;
      if (role) params.role = role;
      const { data } = await adminService.getUsers(params);
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const changeRole = async (id, newRole) => {
    setError('');
    setMessage('');
    try {
      await adminService.updateUserRole(id, newRole);
      setMessage('User role updated.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const removeUser = async (id) => {
    setError('');
    setMessage('');
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await adminService.deleteUser(id);
      setMessage('User deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div>
      <h2>Manage Users</h2>
      <p className="muted section-intro">Search, change roles and remove accounts.</p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      <form className="filter-bar" onSubmit={submitSearch}>
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-sm btn-primary">
          Search
        </button>
      </form>
      {loading ? (
        <Loading />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" hint="Try a different search or filter." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user._id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeUser(user._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination?.page}
            pages={pagination?.pages}
            onPage={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
};

export default UsersSection;