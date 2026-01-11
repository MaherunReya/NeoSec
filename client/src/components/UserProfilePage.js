import React, { useState, useEffect } from 'react';
import { authAPI, loginHistoryAPI, mfaAPI, userProfileAPI, getErrorMessage } from '../services/api';
import { FiMail, FiCalendar, FiKey, FiSmartphone, FiMonitor, FiMapPin, FiClock, FiTrash2, FiAlertTriangle, FiCheckCircle, FiEdit, FiSave, FiX, FiGlobe, FiDownload, FiLogOut, FiCamera } from 'react-icons/fi';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';
import AIAssistant from './AIAssistant';

const UserProfilePage = ({ theme, palette, user, setUser, handleLogout, currentView, setCurrentView, sidebarOpen, setSidebarOpen, isMobile, isTablet, setTheme }) => {
  const darkPalette = {
    bgMain: '#121212', bgCard: '#181818', text: '#ffffff', textMuted: '#9aa3b5',
    border: '#242424', accent: '#36E27B', danger: '#e04848'
  };
  const lightPalette = {
    bgMain: '#f6f8fb', bgCard: '#ffffff', text: '#0b172a', textMuted: '#5b6b7a',
    border: '#d9e2ec', accent: '#1fa45a', danger: '#d4183d'
  };
  const colors = palette || (theme === 'light' ? lightPalette : darkPalette);

  const [editMode, setEditMode] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [themePref, setThemePref] = useState(theme || 'dark');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User data
  const [userData, setUserData] = useState({
    fullName: user?.name || user?.email?.split('@')[0] || 'User',
    username: user?.email?.split('@')[0] || 'user',
    email: user?.email || '',
    role: user?.role || user?.accountType || 'User',
    accountCreated: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown',
    emailVerified: true
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchMFASettings();
    fetchActiveSessions();
    fetchLoginHistory();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.success && response.user) {
        const u = response.user;
        setUserData({
          fullName: u.name || u.email?.split('@')[0] || 'User',
          username: u.email?.split('@')[0] || 'user',
          email: u.email || '',
          role: u.role || u.accountType || 'User',
          accountCreated: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown',
          emailVerified: true
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMFASettings = async () => {
    try {
      const response = await mfaAPI.getMFASettings();
      if (response.success && response.data) {
        setMfaEnabled(response.data.enabled || false);
      }
    } catch (err) {
      // MFA might not be set up, that's okay
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await userProfileAPI.getActiveSessions();
      if (response.success && response.data) {
        const sessions = response.data.map((s) => ({
          id: s.id,
          device: s.device || 'Unknown Device',
          location: s.location || 'Unknown',
          ipAddress: s.ipAddress || 'Unknown',
          lastActivity: s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'Unknown',
          isCurrent: s.isCurrent || false,
          browser: s.browser || 'Unknown',
          os: s.os || 'Unknown'
        }));
        setActiveSessions(sessions);
      }
    } catch (err) {
      console.error('Error fetching active sessions:', err);
      // Fallback to empty array if API fails
      setActiveSessions([]);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const response = await loginHistoryAPI.getLoginHistory({ limit: 10 });
      if (response.success && response.data) {
        setLoginHistory(response.data.map(h => ({
          id: h.id,
          timestamp: h.createdAt ? new Date(h.createdAt).toLocaleString() : 'Unknown',
          ip: h.ipAddress || 'Unknown',
          device: h.userAgent || 'Unknown',
          status: h.success ? 'success' : 'failed'
        })));
      }
    } catch (err) {
      // Handle error silently
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 12.5;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value) => {
    setPasswordData({ ...passwordData, new: value });
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      const updateData = {};
      if (userData.fullName !== user?.name) updateData.name = userData.fullName;
      
      if (Object.keys(updateData).length > 0) {
        const response = await authAPI.updateProfile(updateData);
        if (response.success) {
          setSuccess('Profile updated successfully');
          setEditMode(false);
          if (response.user) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        }
      } else {
        setEditMode(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      setError('');
      if (passwordData.new !== passwordData.confirm) {
        setError('New passwords do not match');
        return;
      }
      if (passwordData.new.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      const response = await authAPI.updateProfile({
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });

      if (response.success) {
        setSuccess('Password updated successfully');
        setShowPasswordDialog(false);
        setPasswordData({ current: '', new: '', confirm: '' });
        setPasswordStrength(0);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogoutSession = async (sessionId) => {
    try {
      const response = await userProfileAPI.logoutSession(sessionId);
      if (response.success) {
        // Remove the session from the list
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
        setSuccess('Session logged out successfully');
        
        // If it was the current session, logout the user
        if (response.data?.isCurrentSession) {
          setTimeout(() => {
            handleLogout();
          }, 1000);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogoutAll = async () => {
    try {
      const response = await userProfileAPI.logoutAllSessions();
      if (response.success) {
        setSuccess(`Logged out ${response.data?.loggedOutCount || 0} session(s) successfully`);
        // Refresh sessions list
        fetchActiveSessions();
        // Logout current user after a short delay
        setTimeout(() => {
          handleLogout();
        }, 1000);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleExportHistory = () => {
    const csv = [
      ['Timestamp', 'IP Address', 'Device', 'Status'].join(','),
      ...loginHistory.map(h => [
        h.timestamp,
        h.ip,
        `"${h.device}"`,
        h.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bgMain }}>
      <Sidebar
        user={user}
        theme={theme}
        palette={palette}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setTheme={setTheme}
        isMobile={isMobile}
        isTablet={isTablet}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? 0 : '260px' }}>
        <Header
          user={user}
          theme={theme}
          palette={palette}
          isMobile={isMobile}
          isTablet={isTablet}
          onLogout={handleLogout}
          onUserUpdate={setUser}
        />

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: colors.bgMain }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', color: colors.text }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>My Profile</h1>
            <p style={{ color: colors.textMuted, marginBottom: '24px' }}>Manage your personal account settings</p>

            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)',
                color: colors.danger,
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.2)',
                color: colors.accent,
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                {success}
              </div>
            )}

            {/* Account Information */}
            <div style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Account Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiEdit size={16} />
                    Edit
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        fetchUserData();
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FiX size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: colors.accent,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FiSave size={16} />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
                {/* Profile Picture */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '128px',
                    height: '128px',
                    backgroundColor: colors.accent,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '48px',
                    fontWeight: 600,
                    position: 'relative'
                  }}>
                    {userData.fullName.charAt(0).toUpperCase()}
                    {editMode && (
                      <button
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          padding: '8px',
                          backgroundColor: colors.bgCard,
                          border: `2px solid ${colors.border}`,
                          borderRadius: '50%',
                          cursor: 'pointer'
                        }}
                      >
                        <FiCamera size={16} color={colors.text} />
                      </button>
                    )}
                  </div>
                  {editMode && (
                    <button
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FiCamera size={16} />
                      Change Photo
                    </button>
                  )}
                </div>

                {/* User Details */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: colors.textMuted, fontSize: '14px' }}>Full Name</label>
                    <input
                      type="text"
                      value={userData.fullName}
                      onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: editMode ? colors.bgMain : colors.bgCard,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: colors.textMuted, fontSize: '14px' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <FiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} size={16} />
                      <input
                        type="email"
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                        disabled={!editMode}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 40px',
                          backgroundColor: editMode ? colors.bgMain : colors.bgCard,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          color: colors.text,
                          fontSize: '14px'
                        }}
                      />
                      {userData.emailVerified && (
                        <FiCheckCircle style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.accent }} size={16} />
                      )}
                    </div>
                    {userData.emailVerified && (
                      <p style={{ fontSize: '12px', color: colors.accent, marginTop: '4px' }}>Email verified</p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: colors.textMuted, fontSize: '14px' }}>Role</label>
                    <input
                      type="text"
                      value={userData.role}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: colors.bgMain,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.textMuted,
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: colors.textMuted, fontSize: '14px' }}>Account Created</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: colors.textMuted }}>
                      <FiCalendar size={16} />
                      <span>{userData.accountCreated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Security Settings</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Password</h3>
                      <p style={{ fontSize: '14px', color: colors.textMuted }}>Last changed 30 days ago</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordDialog(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <FiKey size={16} />
                      Change Password
                    </button>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border }} />

                {/* MFA */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Two-Factor Authentication (MFA)</h3>
                      <p style={{ fontSize: '14px', color: colors.textMuted }}>Add an extra layer of security to your account</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: mfaEnabled ? (theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.2)') : (theme === 'light' ? '#f3f4f6' : colors.bgMain),
                        color: mfaEnabled ? colors.accent : colors.textMuted,
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => setShowMFADialog(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          color: colors.text,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FiSmartphone size={16} />
                        {mfaEnabled ? 'Manage' : 'Setup'} MFA
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border }} />

                {/* Active Sessions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Active Sessions</h3>
                    <button
                      onClick={handleLogoutAll}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        cursor: 'pointer'
                      }}
                    >
                      Log Out All Devices
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          backgroundColor: colors.bgMain,
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            padding: '8px',
                            backgroundColor: colors.bgCard,
                            borderRadius: '8px'
                          }}>
                            <FiMonitor size={20} color={colors.textMuted} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 500 }}>{session.device}</span>
                              {session.isCurrent && (
                                <span style={{
                                  padding: '2px 8px',
                                  backgroundColor: theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.2)',
                                  color: colors.accent,
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 500
                                }}>
                                  Current
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: colors.textMuted }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FiMapPin size={12} />
                                {session.location}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FiGlobe size={12} />
                                {session.ipAddress}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FiClock size={12} />
                                {session.lastActivity}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <button
                            onClick={() => handleLogoutSession(session.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: colors.text,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <FiLogOut size={16} />
                            Log Out
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Preferences */}
            <div style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Privacy & Preferences</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Theme</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>Choose your display theme</p>
                  </div>
                  <select
                    value={themePref}
                    onChange={(e) => {
                      setThemePref(e.target.value);
                      setTheme(e.target.value);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.bgMain,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Language</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>Select your preferred language</p>
                  </div>
                  <select
                    defaultValue="en"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.bgMain,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Timezone</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>Set your local timezone</p>
                  </div>
                  <select
                    defaultValue="utc-5"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.bgMain,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}
                  >
                    <option value="utc-8">UTC-8 (PST)</option>
                    <option value="utc-5">UTC-5 (EST)</option>
                    <option value="utc+0">UTC+0 (GMT)</option>
                    <option value="utc+1">UTC+1 (CET)</option>
                  </select>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Session Timeout</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>Auto-logout after inactivity</p>
                  </div>
                  <select
                    defaultValue="30"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.bgMain,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Login & Security History */}
            <div style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Login & Security History</h2>
                <button
                  onClick={handleExportHistory}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FiDownload size={16} />
                  Export History
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.bgMain, borderBottom: `1px solid ${colors.border}` }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: colors.textMuted }}>Timestamp</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: colors.textMuted }}>IP Address</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: colors.textMuted }}>Device</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: colors.textMuted }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((login) => (
                      <tr key={login.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: colors.textMuted }}>
                          {login.timestamp}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: colors.textMuted }}>
                          {login.ip}
                        </td>
                        <td style={{ padding: '12px', color: colors.text }}>{login.device}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: login.status === 'success' 
                              ? (theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.2)')
                              : (theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)'),
                            color: login.status === 'success' ? colors.accent : colors.danger,
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {login.status === 'success' ? <FiCheckCircle size={12} /> : <FiX size={12} />}
                            {login.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{
              backgroundColor: theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)',
              border: `2px solid ${colors.danger}`,
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '24px' }}>
                <FiAlertTriangle size={24} color={colors.danger} />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px', color: colors.danger }}>Danger Zone</h2>
                  <p style={{ fontSize: '14px', color: colors.textMuted }}>
                    These actions are permanent and cannot be undone
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: colors.bgCard,
                  borderRadius: '8px',
                  border: `1px solid ${colors.danger}`
                }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Deactivate Account</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>
                      Temporarily disable your account. You can reactivate it later.
                    </p>
                  </div>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.danger}`,
                      borderRadius: '8px',
                      color: colors.danger,
                      cursor: 'pointer'
                    }}
                  >
                    Deactivate
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: colors.bgCard,
                  borderRadius: '8px',
                  border: `1px solid ${colors.danger}`
                }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Delete Account</h3>
                    <p style={{ fontSize: '14px', color: colors.textMuted }}>
                      Permanently delete your account and all associated data.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.danger,
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiTrash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowDeleteDialog(false)}
        >
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '8px',
                backgroundColor: theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)',
                borderRadius: '50%'
              }}>
                <FiAlertTriangle size={24} color={colors.danger} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Delete Account</h3>
            </div>
            <p style={{ color: colors.textMuted, marginBottom: '24px' }}>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${colors.danger}`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: colors.danger }}>You will lose:</h4>
              <ul style={{ fontSize: '14px', color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                <li>All firewall rules and configurations</li>
                <li>Security logs and reports</li>
                <li>Threat protection history</li>
                <li>Account settings and preferences</li>
              </ul>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Type "DELETE" to confirm</label>
              <input
                type="text"
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: colors.bgMain,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.danger,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Dialog */}
      {showPasswordDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowPasswordDialog(false)}
        >
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Change Password</h3>
            <p style={{ color: colors.textMuted, marginBottom: '24px', fontSize: '14px' }}>
              Create a strong password to keep your account secure
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: colors.bgMain,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>New Password</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: colors.bgMain,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ color: colors.textMuted }}>Password Strength</span>
                    <span style={{
                      color: passwordStrength >= 75 ? colors.accent : passwordStrength >= 50 ? '#f59e0b' : colors.danger
                    }}>
                      {passwordStrength >= 75 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: colors.bgMain,
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${passwordStrength}%`,
                      height: '100%',
                      backgroundColor: passwordStrength >= 75 ? colors.accent : passwordStrength >= 50 ? '#f59e0b' : colors.danger,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: colors.bgMain,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: theme === 'light' ? '#dbeafe' : 'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${theme === 'light' ? '#93c5fd' : 'rgba(59, 130, 246, 0.3)'}`,
                borderRadius: '8px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#3b82f6' }}>Password Requirements:</h4>
                <ul style={{ fontSize: '13px', color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Includes numbers and special characters</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordData({ current: '', new: '', confirm: '' });
                  setPasswordStrength(0);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordUpdate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MFA Setup Dialog */}
      {showMFADialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowMFADialog(false)}
        >
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Two-Factor Authentication</h3>
            <p style={{ color: colors.textMuted, marginBottom: '24px', fontSize: '14px' }}>
              Enhance your account security with an additional verification step
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: theme === 'light' ? '#d1fae5' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${colors.accent}`,
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <FiCheckCircle size={20} color={colors.accent} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: colors.accent }}>Why enable MFA?</h4>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>
                    MFA adds an extra layer of security by requiring a code from your phone in addition to your password.
                  </p>
                </div>
              </div>
            </div>

            {!mfaEnabled ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '192px',
                    height: '192px',
                    backgroundColor: colors.bgMain,
                    borderRadius: '8px',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textMuted
                  }}>
                    QR Code Here
                  </div>
                  <p style={{ fontSize: '14px', color: colors.textMuted }}>
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.bgMain,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '18px',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <FiCheckCircle size={64} color={colors.accent} style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>MFA is Active</h4>
                <p style={{ fontSize: '14px', color: colors.textMuted }}>
                  Your account is protected with two-factor authentication
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowMFADialog(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  cursor: 'pointer'
                }}
              >
                {mfaEnabled ? 'Close' : 'Cancel'}
              </button>
              {!mfaEnabled ? (
                <button
                  onClick={async () => {
                    // MFA setup logic would go here
                    setMfaEnabled(true);
                    setShowMFADialog(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: colors.accent,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Enable MFA
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await mfaAPI.disableMFA();
                      setMfaEnabled(false);
                      setShowMFADialog(false);
                    } catch (err) {
                      setError(getErrorMessage(err));
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.danger}`,
                    borderRadius: '8px',
                    color: colors.danger,
                    cursor: 'pointer'
                  }}
                >
                  Disable MFA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Floating Button */}
      <AIAssistant
        theme={theme}
        palette={palette}
        user={user}
        mfaEnabled={mfaEnabled}
        activeSessions={activeSessions}
        recentLogins={loginHistory.slice(0, 5)}
      />
    </div>
  );
};

export default UserProfilePage;

