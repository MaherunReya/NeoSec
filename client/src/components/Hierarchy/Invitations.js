import React, { useEffect, useState } from 'react';
import { hierarchyAPI } from '../../services/hierarchyAPI';

const defaultPalette = {
  bgCard: '#111827',
  bgCardAlt: '#0b1220',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#1e293b',
  accent: '#6366f1',
  accentSoft: 'rgba(99,102,241,0.18)',
  danger: '#ef4444',
};

const getPagePalette = (appPalette) => ({
  bgCard: appPalette?.bgCard || defaultPalette.bgCard,
  bgCardAlt: appPalette?.bgPanel || defaultPalette.bgCardAlt,
  text: appPalette?.text || defaultPalette.text,
  textMuted: appPalette?.textMuted || defaultPalette.textMuted,
  border: appPalette?.border || defaultPalette.border,
  accent: appPalette?.accent || defaultPalette.accent,
  accentSoft: appPalette?.accentSoft || defaultPalette.accentSoft,
  danger: appPalette?.danger || defaultPalette.danger,
});

const invitationInfo = [
  'Invitations expire after 7 days.',
  'Accepting an invitation makes you a member of the group.',
  'Group leaders can manage your security configurations.',
  'You can leave a group at any time from the Memberships page.',
];

const Invitations = ({ palette: appPalette }) => {
  const palette = getPagePalette(appPalette);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await hierarchyAPI.getMyInvitations();
      if (response.success) {
        setInvitations(response.invitations || []);
      }
    } catch (fetchError) {
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      const response = await hierarchyAPI.acceptInvitation(invitationId);
      if (response.success) {
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      }
    } catch (acceptError) {
      alert('Failed to accept invitation');
    }
  };

  const handleReject = async (invitationId) => {
    if (!window.confirm('Are you sure you want to reject this invitation?')) return;

    try {
      const response = await hierarchyAPI.rejectInvitation(invitationId);
      if (response.success) {
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      }
    } catch (rejectError) {
      alert('Failed to reject invitation');
    }
  };

  const isExpired = (expiresAt) => new Date(expiresAt) < new Date();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: palette.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8, fontWeight: 500 }}>My Invitations</h1>
        <p style={{ color: palette.textMuted }}>Group invitations you've received</p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${palette.danger}`,
            backgroundColor: 'rgba(239,68,68,0.12)',
            color: palette.danger,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            backgroundColor: palette.bgCard,
            border: `1px solid ${palette.border}`,
            borderRadius: 12,
            padding: 24,
            minHeight: 320,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: palette.textMuted, padding: '56px 0' }}>Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 0' }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                  fontSize: 38,
                  backgroundColor: palette.accentSoft,
                }}
              >
                📬
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 10 }}>No Invitations</h3>
              <p style={{ color: palette.textMuted, maxWidth: 520, margin: '0 auto' }}>
                You don't have any pending group invitations at the moment.
              </p>
            </div>
          ) : (
            <div>
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: palette.bgCardAlt,
                    opacity: isExpired(invitation.expiresAt) ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <h4 style={{ marginBottom: 6 }}>{invitation.group?.name || 'Group'}</h4>
                      <p style={{ color: palette.textMuted, fontSize: 13, marginBottom: 10 }}>
                        {invitation.group?.description || 'No description available'}
                      </p>
                      <p style={{ color: palette.textMuted, fontSize: 12 }}>
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!isExpired(invitation.expiresAt) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                          onClick={() => handleAccept(invitation.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: palette.accent,
                            color: '#fff',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(invitation.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: `1px solid ${palette.border}`,
                            backgroundColor: 'transparent',
                            color: palette.text,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: palette.bgCard,
            border: `1px solid ${palette.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ marginBottom: 14 }}>About Group Invitations</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {invitationInfo.map((item, index) => (
              <li key={index} style={{ marginBottom: 12, color: palette.textMuted, paddingLeft: 18, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: palette.accent }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Invitations;
