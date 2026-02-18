import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { followService } from '../services';
import toast from 'react-hot-toast';
import { FiUserCheck, FiUserX, FiUsers } from 'react-icons/fi';

export default function Notifications() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    followService
      .getRequests()
      .then((res) => setRequests(res.data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const accept = async (userId) => {
    try {
      await followService.acceptRequest(userId);
      setRequests((prev) => prev.filter((r) => (r._id || r) !== userId));
      toast.success('Request accepted');
    } catch {
      toast.error('Failed');
    }
  };

  const decline = async (userId) => {
    try {
      await followService.declineRequest(userId);
      setRequests((prev) => prev.filter((r) => (r._id || r) !== userId));
      toast.success('Request declined');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        <FiUsers className="inline mr-2 text-strongPink" />
        Follow Requests
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiUsers className="mx-auto text-5xl mb-4" />
          <p>No pending follow requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const u = typeof req === 'object' && req.username ? req : req;
            return (
              <div key={u._id} className="card p-4 flex items-center gap-4">
                <Link to={`/profile/${u._id}`}>
                  <img src={u.dp || '/images/dp/default-avatar.svg'}
                    className="w-12 h-12 rounded-full object-cover" alt="" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${u._id}`} className="font-semibold text-sm hover:underline">
                    {u.fullname || u.username}
                  </Link>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => accept(u._id)}
                    className="btn-green px-3 py-1.5 text-sm flex items-center gap-1">
                    <FiUserCheck /> Accept
                  </button>
                  <button onClick={() => decline(u._id)}
                    className="btn-soft px-3 py-1.5 text-sm flex items-center gap-1">
                    <FiUserX /> Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
