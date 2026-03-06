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
  success: '#22c55e',
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
  success: defaultPalette.success,
  danger: appPalette?.danger || defaultPalette.danger,
});

const benefits = [
  'Shared security configurations',
  'Managed VPN and firewall rules',
  'Team collaboration features',
  'Centralized management',
];

const permissions = [
  'Leaders can update your configs',
  'You can still manage your own settings',
  'You can leave a group anytime',
  'View group activity logs',
];

const Memberships = ({ palette: appPalette }) => {
  const palette = getPagePalette(appPalette);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await hierarchyAPI.getMyMemberships();
      if (response.success) {
        setMemberships(response.memberships || []);
      }
    } catch (fetchError) {
      setError('Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async (membershipId, groupName) => {
    if (!window.confirm(`Are you sure you want to leave "${groupName}"?`)) return;

    try {
      const response = await hierarchyAPI.leaveGroup(membershipId);
      if (response.success) {
        setMemberships(memberships.filter((membership) => membership.id !== membershipId));
      }
    } catch (leaveError) {
      alert('Failed to leave group');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: palette.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8, fontWeight: 500 }}>My Memberships</h1>
        <p style={{ color: palette.textMuted }}>Groups you're a member of</p>
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
            minHeight: 360,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: palette.textMuted, padding: '56px 0' }}>Loading memberships...</div>
          ) : memberships.length === 0 ? (
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
                👥
              </div>
              <h3 style={{ fontSize: 24, marginBottom: 10 }}>No Memberships</h3>
              <p style={{ color: palette.textMuted, maxWidth: 520, margin: '0 auto' }}>
                You're not a member of any groups yet. Wait for an invitation from a group leader.
              </p>
            </div>
          ) : (
            <div>
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: palette.bgCardAlt,
                  }}
                >
                  <h4 style={{ marginBottom: 6 }}>{membership.group?.name || 'Group'}</h4>
                  <p style={{ color: palette.textMuted, fontSize: 13, marginBottom: 10 }}>
                    {membership.group?.description || 'No description available'}
                  </p>
                  <p style={{ color: palette.textMuted, fontSize: 12, marginBottom: 12 }}>
                    Leader: {membership.group?.leader?.email || 'Unknown'}
                  </p>
                  <button
                    onClick={() => handleLeaveGroup(membership.id, membership.group?.name || 'this group')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${palette.danger}`,
                      backgroundColor: 'transparent',
                      color: palette.danger,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Leave Group
                  </button>
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
          <h3 style={{ marginBottom: 16 }}>About Group Memberships</h3>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 10, fontSize: 15 }}>Benefits</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {benefits.map((item, index) => (
                <li key={index} style={{ marginBottom: 10, color: palette.textMuted, paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: palette.success }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: 10, fontSize: 15 }}>Permissions</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {permissions.map((item, index) => (
                <li key={index} style={{ marginBottom: 10, color: palette.textMuted, paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: palette.accent }}>🛡</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Memberships;
