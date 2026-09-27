import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { patientService } from '../services/patientService';
import { doctorService } from '../services/doctorService';
import { useAuth } from '../hooks/useAuth';

const VideoCallPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const service = user?.role === 'doctor' ? doctorService : patientService;
      const { data } = await service.getVideoRoom(id);
      setRoom(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the video room.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const mountJitsi = useCallback(
    (domain, roomName) => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: 520,
        userInfo: { displayName: user?.name || 'SmartCare user' },
        configOverwrite: { prejoinPageEnabled: false },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
      setJoined(true);
    },
    [user?.name]
  );

  const join = () => {
    if (!room?.videoRoomUrl) return;
    const url = new URL(room.videoRoomUrl);
    const domain = url.host;
    const roomName = url.pathname.replace(/^\//, '');

    if (window.JitsiMeetExternalAPI) {
      mountJitsi(domain, roomName);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => mountJitsi(domain, roomName);
    script.onerror = () => setScriptError(true);
    document.body.appendChild(script);
  };

  useEffect(
    () => () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    },
    []
  );

  if (loading) return <div className="page-container"><Loading /></div>;

  return (
    <div className="page-container video-page">
      <h1>Video Consultation</h1>
      {error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <>
          <p className="muted">
            Secure consultation room. The join button becomes active 15 minutes before the
            appointment start time.
          </p>
          {!room?.canJoin && (
            <div className="alert alert-warning">
              This room opens 15 minutes before your appointment
              {room?.startTime ? ` (scheduled at ${room.startTime})` : ''}. You can still join early
              to test your camera and microphone.
            </div>
          )}

          {scriptError && (
            <div className="alert alert-error">
              Could not load the video engine. Open the room in a new tab instead:{' '}
              <a href={room.videoRoomUrl} target="_blank" rel="noreferrer">
                {room.videoRoomUrl}
              </a>
            </div>
          )}

          {!joined ? (
            <div className="video-lobby card">
              <p>
                Room: <strong>{room.videoRoomId}</strong>
              </p>
              <div className="card-actions">
                <button type="button" className="btn btn-primary" onClick={join}>
                  Join video consultation
                </button>
                <a className="btn btn-outline" href={room.videoRoomUrl} target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
                <Link className="btn btn-outline" to={`/${user?.role}`}>
                  Back to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div ref={containerRef} className="jitsi-container" />
          )}
        </>
      )}
    </div>
  );
};

export default VideoCallPage;