import React, { useEffect, useMemo, useRef, useState } from 'react';
import { authAPI, loginHistoryAPI, mfaAPI, settingsAPI } from '../services/api';

const defaultPalette = {
  bgMain: '#121212',
  bgCard: '#181818',
  bgPanel: '#0a0a0a',
  text: '#ffffff',
  textMuted: '#9aa3b5',
  border: '#242424',
  accent: '#1E8C4A',
  accentSoft: 'rgba(30,140,74,0.12)',
  warning: '#f0a500',
  danger: '#e04848',
};

const getPagePalette = (palette) => ({
  bgMain: palette?.bgMain || defaultPalette.bgMain,
  bgCard: palette?.bgCard || defaultPalette.bgCard,
  bgPanel: palette?.bgPanel || defaultPalette.bgPanel,
  text: palette?.text || defaultPalette.text,
  textMuted: palette?.textMuted || defaultPalette.textMuted,
  border: palette?.border || defaultPalette.border,
  accent: palette?.accent || defaultPalette.accent,
  accentSoft: palette?.accentSoft || defaultPalette.accentSoft,
  warning: palette?.warning || defaultPalette.warning,
  danger: palette?.danger || defaultPalette.danger,
});

const formatRole = (role = '') => {
  if (!role) return 'User';
  return role[0].toUpperCase() + role.slice(1);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const timeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const deviceLabel = (userAgent = '') => {
  const agent = String(userAgent || '').toLowerCase();
  if (!agent) return 'Unknown Device';
  if (agent.includes('iphone')) return 'iPhone';
  if (agent.includes('android')) return 'Android Device';
  if (agent.includes('windows')) return 'Windows Device';
  if (agent.includes('mac')) return 'Mac Device';
  if (agent.includes('linux')) return 'Linux Device';
  return 'Browser Session';
};

const AccountSettings = ({ palette: appPalette, showToast }) => {
  const palette = getPagePalette(appPalette);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [error, setError] = useState(null);

  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });
  const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' });

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [emailEditable, setEmailEditable] = useState(false);
  const fileInputRef = useRef(null);

  const [notifications, setNotifications] = useState({
    groupInvitations: true,
    securityAlerts: true,
    billingUpdates: false,
  });

  const [userData, setUserData] = useState({
    firstName: 'User',
    lastName: '',
    username: 'user',
    avatarUrl: null,
    email: '',
    role: 'User',
    accountCreated: 'N/A',
    emailVerified: false,
  });

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setSecurityLoading(true);
        setError(null);

        const [settingsResponse, mfaSettings, historyResponse] = await Promise.all([
          settingsAPI.getMySettings(),
          mfaAPI.getMFASettings(),
          loginHistoryAPI.getLoginHistory({ page: 1, limit: 20 }),
        ]);

        const profile = settingsResponse?.data?.profile || {};
        const notificationPrefs = settingsResponse?.data?.notifications || {};

        setUserData({
          firstName: profile.firstName || 'User',
          lastName: profile.lastName || '',
          username: profile.username || 'user',
          avatarUrl: profile.avatarUrl || null,
          email: profile.email || '',
          role: formatRole(profile.role),
          accountCreated: formatDate(profile.createdAt),
          emailVerified: Boolean(profile.emailVerified),
        });

        setNotifications({
          groupInvitations: Boolean(notificationPrefs.groupInvitations),
          securityAlerts: Boolean(notificationPrefs.securityAlerts),
          billingUpdates: Boolean(notificationPrefs.billingUpdates),
        });

        setMfaEnabled(Boolean(mfaSettings?.data?.enabled));

        const historyRows = (historyResponse?.data || []).map((item) => ({
          id: item.id,
          timestamp: formatDateTime(item.createdAt),
          rawTimestamp: item.createdAt,
          ip: item.ipAddress || 'Unknown',
          device: deviceLabel(item.userAgent),
          status: item.success ? 'success' : 'failed',
          userAgent: item.userAgent,
        }));

        setLoginHistory(historyRows);

        const successful = (historyResponse?.data || []).filter((item) => item.success);
        const byKey = [];
        const seen = new Set();

        successful.forEach((entry) => {
          const key = `${entry.ipAddress || 'unknown'}-${entry.userAgent || 'unknown'}`;
          if (!seen.has(key) && byKey.length < 5) {
            seen.add(key);
            byKey.push({
              id: entry.id,
              device: deviceLabel(entry.userAgent),
              ipAddress: entry.ipAddress || 'Unknown',
              location: entry.location || 'Unknown Location',
              lastActivity: timeAgo(entry.createdAt),
              isCurrent: byKey.length === 0,
            });
          }
        });

        setSessions(byKey);
      } catch (loadError) {
        setError('Failed to load settings data.');
      } finally {
        setLoading(false);
        setSecurityLoading(false);
      }
    };

    loadAll();
  }, []);

  const avatarInitials = useMemo(() => {
    const first = userData.firstName?.[0] || 'U';
    const last = userData.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  }, [userData.firstName, userData.lastName]);

  const handleSavePersonalInfo = async () => {
    try {
      setSavingProfile(true);
      setError(null);
      const response = await settingsAPI.updateProfile({
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
      });

      const data = response?.data || {};
      setUserData((prev) => ({
        ...prev,
        firstName: data.firstName || prev.firstName,
        lastName: data.lastName || prev.lastName,
        username: data.username || prev.username,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : prev.avatarUrl,
        email: data.email || prev.email,
        role: formatRole(data.role || prev.role),
        accountCreated: data.createdAt ? formatDate(data.createdAt) : prev.accountCreated,
        emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : prev.emailVerified,
      }));
      setEmailEditable(false);

      const existingUser = authAPI.getCurrentUser() || {};
      const normalizedRole = String(data.role || existingUser.role || existingUser.accountType || 'user').toLowerCase();
      const updatedAuthUser = {
        ...existingUser,
        email: data.email || userData.email,
        role: normalizedRole === 'leader' ? (existingUser.role || 'user') : normalizedRole,
        accountType: normalizedRole,
      };
      localStorage.setItem('user', JSON.stringify(updatedAuthUser));
      window.dispatchEvent(new CustomEvent('neosec-user-updated', { detail: updatedAuthUser }));

      showToast('Personal information updated successfully.', 'success');
    } catch (saveError) {
      setError(saveError?.response?.data?.message || 'Failed to save personal information.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.current || !passwordData.next || !passwordData.confirm) {
      setError('Please fill in all password fields.');
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      setError(null);
      await settingsAPI.updatePassword({
        currentPassword: passwordData.current,
        newPassword: passwordData.next,
        confirmPassword: passwordData.confirm,
      });

      setPasswordData({ current: '', next: '', confirm: '' });
      showToast('Password updated successfully.', 'success');
    } catch (passwordError) {
      setError(passwordError?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setMfaLoading(true);
      if (mfaEnabled) {
        await mfaAPI.disableMFA();
        setMfaEnabled(false);
        showToast('Two-factor authentication disabled.', 'success');
        return;
      }

      await mfaAPI.setupMFA('authenticator_app');
      const code = window.prompt('Enter the 6-digit verification code to enable 2FA:');
      if (!code) {
        setError('2FA setup canceled.');
        return;
      }

      await mfaAPI.verifyMFA(code);
      setMfaEnabled(true);
      showToast('Two-factor authentication enabled.', 'success');
      setError(null);
    } catch (toggleError) {
      setError('Unable to update 2FA settings.');
    } finally {
      setMfaLoading(false);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      await loginHistoryAPI.terminateSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      setLoginHistory((prev) => prev.filter((row) => row.id !== sessionId));
      showToast('Session terminated successfully.', 'success');
      setError(null);
    } catch (sessionError) {
      setError(sessionError?.response?.data?.message || 'Failed to terminate session.');
    }
  };

  const terminateAllSessions = async () => {
    try {
      const current = sessions.find((session) => session.isCurrent);
      await loginHistoryAPI.terminateAllSessions(current?.id || null);
      setSessions((prev) => prev.filter((session) => session.isCurrent));
      if (current?.id) {
        setLoginHistory((prev) => prev.filter((row) => row.id === current.id));
      }
      showToast('All other sessions have been terminated.', 'success');
      setError(null);
    } catch (sessionError) {
      setError(sessionError?.response?.data?.message || 'Failed to terminate sessions.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await settingsAPI.deleteMyAccount();
      authAPI.logout();
      window.location.href = '/';
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || 'Failed to delete account.');
      setShowDeleteDialog(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  const toggleNotification = async (key) => {
    const nextState = {
      ...notifications,
      [key]: !notifications[key],
    };

    try {
      setSavingNotifications(true);
      setNotifications(nextState);
      await settingsAPI.updateNotifications(nextState);
      showToast('Notification preferences updated.', 'success');
      setError(null);
    } catch (notificationError) {
      setNotifications(notifications);
      setError(notificationError?.response?.data?.message || 'Failed to update notifications.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleUploadAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUserData((prev) => ({ ...prev, avatarUrl: reader.result }));
        showToast('Photo selected. Click Save Changes to persist it.', 'info');
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setUserData((prev) => ({ ...prev, avatarUrl: null }));
    showToast('Photo removed. Click Save Changes to persist it.', 'info');
    setError(null);
  };

  const cardStyle = {
    backgroundColor: palette.bgCard,
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    padding: 24,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    color: palette.text,
    fontSize: 14,
    fontWeight: 500,
  };

  const inputStyle = {
    width: '100%',
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    backgroundColor: palette.bgPanel,
    color: palette.text,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
  };

  const buttonPrimary = {
    border: 'none',
    borderRadius: 8,
    backgroundColor: palette.accent,
    color: '#ffffff',
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  };

  const buttonOutline = {
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: palette.text,
    padding: '9px 14px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', color: palette.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
        <h2 style={{ fontSize: 28, fontWeight: 500 }}>Loading profile settings...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: palette.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 400 }}>
      <style>
        {`
          @keyframes neosecTabFadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, marginBottom: 6, fontWeight: 500 }}>My Profile</h1>
        <p style={{ margin: 0, color: palette.textMuted }}>Manage your account settings and preferences</p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${palette.danger}`,
            backgroundColor: 'rgba(224,72,72,0.12)',
            color: palette.danger,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'security', label: 'Security' },
          { id: 'notifications', label: 'Notifications' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              border: activeTab === tab.id ? `1px solid ${palette.accent}` : `1px solid ${palette.border}`,
              backgroundColor: activeTab === tab.id ? palette.accentSoft : palette.bgCard,
              color: activeTab === tab.id ? palette.accent : palette.text,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gap: 18, animation: 'neosecTabFadeIn 0.22s ease' }}>
          <section style={cardStyle}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 500 }}>Personal Information</h3>
            <p style={{ margin: '0 0 20px 0', color: palette.textMuted, fontSize: 14 }}>Update your personal details and profile picture</p>

            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.accent,
                  color: '#ffffff',
                  fontSize: 24,
                  fontWeight: 500,
                  overflow: 'hidden',
                }}
              >
                {userData.avatarUrl ? (
                  <img src={userData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  avatarInitials
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadAvatar}
                />
                <button type="button" style={buttonOutline} onClick={() => fileInputRef.current?.click()}>Upload Photo</button>
                <button type="button" style={{ ...buttonOutline, color: palette.danger, border: `1px solid ${palette.danger}` }} onClick={handleRemoveAvatar}>Remove</button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input
                  value={userData.firstName}
                  onChange={(event) => setUserData((prev) => ({ ...prev, firstName: event.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input
                  value={userData.lastName}
                  onChange={(event) => setUserData((prev) => ({ ...prev, lastName: event.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  value={userData.username}
                  onChange={(event) => setUserData((prev) => ({ ...prev, username: event.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={userData.email}
                    readOnly={!emailEditable}
                    onChange={(event) => setUserData((prev) => ({ ...prev, email: event.target.value }))}
                    style={{ ...inputStyle, backgroundColor: emailEditable ? palette.bgPanel : palette.bgMain }}
                  />
                  <button
                    type="button"
                    onClick={() => setEmailEditable((prev) => !prev)}
                    style={{ ...buttonOutline, whiteSpace: 'nowrap' }}
                  >
                    {emailEditable ? 'Lock Email' : 'Change Email'}
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                backgroundColor: palette.bgPanel,
                border: `1px solid ${palette.border}`,
              }}
            >
              <strong style={{ color: userData.emailVerified ? palette.accent : palette.warning, fontWeight: 500 }}>
                Email {userData.emailVerified ? 'Verified' : 'Not Verified'}
              </strong>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${palette.border}` }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 500 }}>Account Details</h4>
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <div style={{ color: palette.textMuted, fontSize: 13 }}>Role</div>
                  <div style={{ marginTop: 4 }}>{userData.role}</div>
                </div>
                <div>
                  <div style={{ color: palette.textMuted, fontSize: 13 }}>Account Created</div>
                  <div style={{ marginTop: 4 }}>{userData.accountCreated}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" disabled={savingProfile} onClick={handleSavePersonalInfo} style={{ ...buttonPrimary, opacity: savingProfile ? 0.7 : 1, cursor: savingProfile ? 'not-allowed' : 'pointer' }}>
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </section>

          <section
            style={{
              ...cardStyle,
              border: `1px solid ${palette.danger}`,
              backgroundColor: 'rgba(224,72,72,0.08)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', color: palette.danger, fontSize: 20, fontWeight: 500 }}>Delete Account</h3>
            <p style={{ margin: '0 0 14px 0', color: palette.text }}>Once you delete your account, there is no going back. Please be certain.</p>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              style={{
                border: 'none',
                borderRadius: 8,
                backgroundColor: palette.danger,
                color: '#ffffff',
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete My Account
            </button>
          </section>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'grid', gap: 18, animation: 'neosecTabFadeIn 0.22s ease' }}>
          <section style={cardStyle}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 20, fontWeight: 500 }}>Security & Authentication</h3>

            <h4 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 500 }}>Password</h4>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdatePassword();
              }}
            >
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {[
                { key: 'current', label: 'Current Password' },
                { key: 'next', label: 'New Password' },
                { key: 'confirm', label: 'Confirm New Password' },
              ].map((field) => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword[field.key] ? 'text' : 'password'}
                      value={passwordData[field.key]}
                      onChange={(event) => setPasswordData((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      style={{ ...inputStyle, paddingRight: 80 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: palette.textMuted,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {showPassword[field.key] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingPassword} style={{ ...buttonPrimary, opacity: savingPassword ? 0.7 : 1, cursor: savingPassword ? 'not-allowed' : 'pointer' }}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
            </form>

            <div style={{ margin: '18px 0', borderTop: `1px solid ${palette.border}` }} />

            <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 500 }}>Two-Factor Authentication (2FA)</h4>
            <p style={{ margin: '0 0 12px 0', color: palette.textMuted, fontSize: 14 }}>Add an extra layer of security to your account.</p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  backgroundColor: mfaEnabled ? palette.accentSoft : palette.bgPanel,
                  color: mfaEnabled ? palette.accent : palette.textMuted,
                  border: `1px solid ${mfaEnabled ? palette.accent : palette.border}`,
                }}
              >
                Status: {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>

              <button
                type="button"
                disabled={mfaLoading}
                onClick={handleToggle2FA}
                style={{
                  ...buttonOutline,
                  border: `1px solid ${mfaEnabled ? palette.danger : palette.border}`,
                  color: mfaEnabled ? palette.danger : palette.text,
                  opacity: mfaLoading ? 0.7 : 1,
                  cursor: mfaLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {mfaLoading ? 'Please wait...' : mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 500 }}>Active Sessions</h3>
                <p style={{ margin: 0, color: palette.textMuted, fontSize: 14 }}>View and terminate active sessions</p>
              </div>
              <button type="button" onClick={terminateAllSessions} style={{ ...buttonOutline, color: palette.danger, border: `1px solid ${palette.danger}` }}>
                Terminate All
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {securityLoading ? (
                <div style={{ color: palette.textMuted }}>Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div style={{ color: palette.textMuted }}>No active sessions found.</div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      border: `1px solid ${palette.border}`,
                      backgroundColor: palette.bgPanel,
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{session.device}</div>
                      <div style={{ color: palette.textMuted, fontSize: 13 }}>{session.location} • {session.ipAddress}</div>
                      <div style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>Last active {session.lastActivity}</div>
                    </div>
                    {session.isCurrent ? (
                      <span
                        style={{
                          border: `1px solid ${palette.accent}`,
                          color: palette.accent,
                          backgroundColor: palette.accentSoft,
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 12,
                        }}
                      >
                        Current
                      </span>
                    ) : (
                      <button type="button" onClick={() => terminateSession(session.id)} style={{ ...buttonOutline, color: palette.danger, border: `1px solid ${palette.danger}` }}>
                        Terminate
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={cardStyle}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 500 }}>Login History</h3>
            <p style={{ margin: '0 0 14px 0', color: palette.textMuted, fontSize: 14 }}>Recent login attempts with timestamps, IPs, devices, and status</p>

            <div style={{ overflowX: 'auto', border: `1px solid ${palette.border}`, borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${palette.border}`, backgroundColor: palette.bgPanel }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: palette.textMuted, fontSize: 13, fontWeight: 500 }}>Timestamp</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: palette.textMuted, fontSize: 13, fontWeight: 500 }}>IP Address</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: palette.textMuted, fontSize: 13, fontWeight: 500 }}>Device</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: palette.textMuted, fontSize: 13, fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {securityLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 14, color: palette.textMuted }}>Loading login history...</td>
                    </tr>
                  ) : loginHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 14, color: palette.textMuted }}>No login history available.</td>
                    </tr>
                  ) : (
                    loginHistory.map((row) => (
                      <tr key={row.id} style={{ borderTop: `1px solid ${palette.border}` }}>
                        <td style={{ padding: '10px 12px' }}>{row.timestamp}</td>
                        <td style={{ padding: '10px 12px', color: palette.textMuted }}>{row.ip}</td>
                        <td style={{ padding: '10px 12px', color: palette.textMuted }}>{row.device}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              borderRadius: 999,
                              padding: '3px 8px',
                              fontSize: 12,
                              backgroundColor: row.status === 'success' ? palette.accentSoft : 'rgba(224,72,72,0.12)',
                              color: row.status === 'success' ? palette.accent : palette.danger,
                              border: `1px solid ${row.status === 'success' ? palette.accent : palette.danger}`,
                            }}
                          >
                            {row.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'notifications' && (
        <section style={{ ...cardStyle, animation: 'neosecTabFadeIn 0.22s ease' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 500 }}>Notification Preferences</h3>
          <p style={{ margin: '0 0 14px 0', color: palette.textMuted, fontSize: 14 }}>Choose what notifications you want to receive</p>

          <div style={{ display: 'grid', gap: 10 }}>
            {[
              {
                key: 'groupInvitations',
                title: 'Group Invitations',
                description: 'Receive emails when you are invited to a new group',
              },
              {
                key: 'securityAlerts',
                title: 'Security Alerts',
                description: 'Get notified about firewall updates or VPN issues',
              },
              {
                key: 'billingUpdates',
                title: 'Billing Updates',
                description: 'Receive monthly invoices and subscription alerts',
              },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.bgPanel,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  <div style={{ color: palette.textMuted, fontSize: 13 }}>{item.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(notifications[item.key])}
                  disabled={savingNotifications}
                  onClick={() => toggleNotification(item.key)}
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: notifications[item.key] ? palette.accent : palette.border,
                    position: 'relative',
                    flexShrink: 0,
                    opacity: savingNotifications ? 0.7 : 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: notifications[item.key] ? 25 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showDeleteDialog && (
        <div
          onClick={() => setShowDeleteDialog(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              borderRadius: 12,
              border: `1px solid ${palette.danger}`,
              backgroundColor: palette.bgCard,
              padding: 20,
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: palette.danger, fontSize: 20, fontWeight: 500 }}>Delete Account</h3>
            <p style={{ margin: '0 0 16px 0', color: palette.textMuted }}>
              This action cannot be undone. This will permanently delete your account and remove your data.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowDeleteDialog(false)} style={buttonOutline}>Cancel</button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: palette.danger,
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  opacity: deletingAccount ? 0.7 : 1,
                }}
              >
                {deletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
