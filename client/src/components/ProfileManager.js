import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiInfo,
  FiLayers,
  FiMail,
  FiMapPin,
  FiMoreVertical,
  FiPlus,
  FiPower,
  FiSearch,
  FiShare2,
  FiShield,
  FiTrash2,
  FiUsers,
  FiWifi,
  FiWifiOff,
  FiX,
  FiZap,
  FiZapOff
} from 'react-icons/fi';
const ConfirmModal = ({ message, onConfirm, onCancel, colors }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          style={{
            margin: '0 0 24px 0',
            color: colors.textMuted,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: colors.accent,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            OK
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: colors.danger,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast notification component
const Toast = ({ message, type, onClose, colors = {}, theme = 'dark' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBgColor = () => {
    if (type === 'success') return theme === 'dark' ? '#1a3a2a' : 'rgba(31,164,90,0.1)';
    if (type === 'error') return theme === 'dark' ? '#2A1515' : 'rgba(212,24,61,0.08)';
    return theme === 'dark' ? '#2a2a1a' : 'rgba(240,165,0,0.1)';
  };

  const getTextColor = () => {
    if (type === 'success') return theme === 'dark' ? '#7fdf9f' : colors.accent;
    if (type === 'error') return theme === 'dark' ? '#FFB3B3' : colors.danger;
    return colors.warning;
  };

  const getBorderColor = () => {
    if (type === 'success') return colors.accent || '#36E27B';
    if (type === 'error') return colors.danger || '#e04848';
    return colors.warning || '#f0a500';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '16px 20px',
        backgroundColor: getBgColor(),
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '8px',
        color: getTextColor(),
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        maxWidth: '400px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: getTextColor(),
          cursor: 'pointer',
          fontSize: '18px',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};


// Same idea as App.js / ScanDashboard
const darkPalette = {
  bgMain: '#121212',
  bgCard: '#181818',
  bgPanel: '#0a0a0a',
  text: '#ffffff',
  textMuted: '#9ca3af',
  border: '#374151',
  accent: '#1E8C4A',
  accentSoft: 'rgba(30,140,74,0.18)',
  warning: '#fbbf24',
  danger: '#f87171',
  inputBg: '#1f2937',
  inputBorder: '#374151'
};

const lightPalette = {
  bgMain: '#f9fafb',
  bgCard: '#ffffff',
  bgPanel: '#f3f4f6',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  accent: '#16a34a',
  accentSoft: '#dcfce7',
  warning: '#d97706',
  danger: '#d4183d',
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb'
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const scheduleTypeMap = {
  NONE: 'none',
  TIME: 'time',
  CONDITION: 'geolocation',
  BOTH: 'both'
};
const scheduleTypeReverseMap = {
  none: 'NONE',
  time: 'TIME',
  geolocation: 'CONDITION',
  both: 'BOTH'
};

const profileTypeOptions = ['Work Mode', 'Public WiFi Mode', 'Home Mode', 'Custom'];
const vpnProtocolOptions = ['OpenVPN', 'WireGuard', 'IKEv2'];

const toTitle = (text = '') => {
  const normalized = String(text || '').replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const getActionColor = (action, isDark) => {
  if (action === 'CREATED') return { bg: isDark ? 'rgba(59,130,246,0.28)' : '#dbeafe', fg: isDark ? '#60a5fa' : '#1d4ed8' };
  if (action === 'UPDATED') return { bg: isDark ? 'rgba(217,119,6,0.28)' : '#fef3c7', fg: isDark ? '#fbbf24' : '#b45309' };
  if (action === 'DELETED') return { bg: isDark ? 'rgba(220,38,38,0.28)' : '#fee2e2', fg: isDark ? '#f87171' : '#b91c1c' };
  if (action === 'ACTIVATED' || action === 'AUTO_ACTIVATED') return { bg: isDark ? 'rgba(30,140,74,0.28)' : '#dcfce7', fg: isDark ? '#1E8C4A' : '#15803d' };
  if (action === 'DEACTIVATED') return { bg: isDark ? '#374151' : '#f3f4f6', fg: isDark ? '#d1d5db' : '#374151' };
  if (action === 'SCHEDULED' || action === 'SHARED') return { bg: isDark ? 'rgba(147,51,234,0.28)' : '#f3e8ff', fg: isDark ? '#c084fc' : '#7e22ce' };
  return { bg: isDark ? '#374151' : '#f3f4f6', fg: isDark ? '#9ca3af' : '#6b7280' };
};

const getTypeColor = (profileType, isDark) => {
  const type = String(profileType || '').toLowerCase();
  if (type.includes('enhanced')) return { bg: isDark ? 'rgba(147,51,234,0.28)' : '#f3e8ff', fg: isDark ? '#c084fc' : '#7e22ce' };
  if (type.includes('custom')) return { bg: isDark ? 'rgba(217,119,6,0.28)' : '#fef3c7', fg: isDark ? '#fbbf24' : '#b45309' };
  return { bg: isDark ? 'rgba(37,99,235,0.28)' : '#dbeafe', fg: isDark ? '#60a5fa' : '#1d4ed8' };
};

const getFirewallActionName = (action) => {
  if (action === 0) return 'ACCEPT';
  if (action === 1) return 'REJECT';
  if (action === 2) return 'DROP';
  return String(action || 'N/A').toUpperCase();
};

const getFirewallProtocolName = (protocol) => {
  if (protocol === 0) return 'TCP';
  if (protocol === 1) return 'UDP';
  if (protocol === 2) return 'BOTH';
  return String(protocol || 'ANY').toUpperCase();
};

const formatFirewallRule = (rule) => {
  if (!rule) return 'Unknown Rule';
  if (rule.action === undefined) return rule.name || `Rule ${rule.id}`;
  
  const actionText = getFirewallActionName(rule.action);
  const protoText = getFirewallProtocolName(rule.protocol);
  const portText = (rule.port_start === rule.port_end || !rule.port_end) 
    ? rule.port_start 
    : `${rule.port_start}-${rule.port_end}`;
    
  return `[${actionText}] ${rule.ip_address || rule.source || 'Any'} | Port: ${portText || 'Any'} | Proto: ${protoText}`;
};

const getFeatureTone = (enabled, kind, isDark) => {
  if (!enabled) {
    return {
      bg: isDark ? '#1f2937' : '#f9fafb',
      fg: '#6b7280'
    };
  }
  if (kind === 'vpn') return { bg: isDark ? 'rgba(30,140,74,0.16)' : '#f0fdf4', fg: isDark ? '#1E8C4A' : '#15803d' };
  if (kind === 'firewall') return { bg: isDark ? 'rgba(37,99,235,0.16)' : '#eff6ff', fg: isDark ? '#60a5fa' : '#1d4ed8' };
  return { bg: isDark ? 'rgba(147,51,234,0.16)' : '#faf5ff', fg: isDark ? '#c084fc' : '#7e22ce' };
};

const createEmptyFormData = () => ({
  name: '',
  description: '',
  profileType: 'Custom',
  vpnEnabled: false,
  vpnServer: '',
  vpnProtocol: 'OpenVPN',
  vpnPort: '',
  vpnUsername: '',
  firewallRuleIds: [],
  defaultFirewallAction: 'DENY',
  schedule: {
    enabled: false,
    type: 'none',
    startTime: '09:00',
    endTime: '17:00',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    geoCountries: [],
    autoActivate: false
  }
});

const Modal = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}
  >
    <div onClick={(event) => event.stopPropagation()}>{children}</div>
  </div>
);

function ProfileManager({ theme = 'dark', palette }) {
  const colors = palette || (theme === 'light' ? lightPalette : lightPalette);
  const isDark = theme !== 'light';

  const [profiles, setProfiles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [firewallRulesets, setFirewallRulesets] = useState([]);
  const [vpnConfigs, setVpnConfigs] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showManageSharesDialog, setShowManageSharesDialog] = useState(false);

  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState(createEmptyFormData());

  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  const [shareForm, setShareForm] = useState({
    permissions: 'VIEW',
    password: '',
    expiresInDays: '',
    maxAccess: ''
  });

  const [geoSearch, setGeoSearch] = useState('');
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const geoInputRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError('');

        const [profilesRes, logsRes, firewallRes, sharesRes, vpnRes] = await Promise.all([
          api.get('/profiles'),
          api.get('/profiles/logs/all'),
          api.get('/firewall'),
          api.get('/auth/shared-profiles/my/shares'),
          api.get('/vpn')
        ]);

        setProfiles(profilesRes.data?.profiles || []);
        setActivityLogs(logsRes.data?.logs || []);
        setFirewallRulesets(firewallRes.data?.data || []);
        setShareLinks(sharesRes.data?.data || []);
        setVpnConfigs(vpnRes.data?.data || vpnRes.data || []);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Failed to load security profile manager data'));
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    const closeGeoDropdownOnOutside = (event) => {
      if (!geoInputRef.current) return;
      if (!geoInputRef.current.contains(event.target)) {
        setShowGeoDropdown(false);
      }
    };

    window.addEventListener('mousedown', closeGeoDropdownOnOutside);
    return () => window.removeEventListener('mousedown', closeGeoDropdownOnOutside);
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const query = searchQuery.trim().toLowerCase();
      const inName = String(profile.name || '').toLowerCase().includes(query);
      const inDescription = String(profile.description || '').toLowerCase().includes(query);
      const matchesSearch = !query || inName || inDescription;

      const profileType = String(profile.profileType || '').toLowerCase();
      const matchesType = filterType === 'all' || profileType === filterType;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && profile.isActive) ||
        (filterStatus === 'inactive' && !profile.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [profiles, searchQuery, filterType, filterStatus]);

  const activeCount = useMemo(() => profiles.filter((profile) => profile.isActive).length, [profiles]);
  const totalShares = useMemo(
    () => shareLinks.filter((link) => link.isActive && !link.revokedAt).length,
    [shareLinks]
  );

  const filteredCountries = useMemo(() => {
    const allCountries = [
      'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia',
      'Netherlands', 'Singapore', 'Switzerland', 'Sweden', 'Norway', 'South Korea', 'Brazil',
      'India', 'Ireland', 'Finland', 'Denmark', 'New Zealand', 'Belgium', 'Austria', 'Italy',
      'Spain', 'Portugal', 'Bangladesh', 'Malaysia', 'Thailand', 'UAE', 'Qatar'
    ];

    const query = geoSearch.trim().toLowerCase();
    if (!query) return allCountries.filter((country) => !formData.schedule.geoCountries.includes(country));

    return allCountries
      .filter((country) => country.toLowerCase().includes(query))
      .filter((country) => !formData.schedule.geoCountries.includes(country));
  }, [geoSearch, formData.schedule.geoCountries]);

  const resetForm = () => {
    setEditingProfile(null);
    setFormData(createEmptyFormData());
    setGeoSearch('');
    setShowGeoDropdown(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name || '',
      description: profile.description || '',
      profileType: profile.profileType || 'Custom',
      vpnEnabled: Boolean(profile.vpnEnabled),
      vpnServer: profile.vpnServer || '',
      vpnProtocol: profile.vpnProtocol || 'OpenVPN',
      vpnPort: profile.vpnPort ? String(profile.vpnPort) : '',
      vpnUsername: profile.vpnUsername || '',
      firewallRuleIds: Array.isArray(profile.firewallRules) ? profile.firewallRules.map(String) : [],
      defaultFirewallAction: profile.defaultFirewallAction || 'DENY',
      schedule: {
        enabled: Boolean(profile.isScheduled),
        type: scheduleTypeMap[profile.scheduleType] || 'none',
        startTime: profile.scheduleStartTime || '09:00',
        endTime: profile.scheduleEndTime || '17:00',
        activeDays: Array.isArray(profile.scheduleDays) ? profile.scheduleDays : [],
        geoCountries: Array.isArray(profile.geoLocationCountries) ? profile.geoLocationCountries : [],
        autoActivate: Boolean(profile.autoActivate)
      }
    });
    setShowForm(true);
  };

  const payloadFromForm = () => {
    return {
      name: formData.name.trim(),
      description: formData.description.trim(),
      profileType: formData.profileType,
      vpnEnabled: formData.vpnEnabled,
      vpnServer: formData.vpnEnabled ? formData.vpnServer.trim() || null : null,
      vpnProtocol: formData.vpnEnabled ? formData.vpnProtocol : null,
      vpnPort: formData.vpnEnabled && formData.vpnPort ? parseInt(formData.vpnPort, 10) : null,
      vpnUsername: formData.vpnEnabled ? formData.vpnUsername.trim() || null : null,
      firewallEnabled: true,
      firewallRules: formData.firewallRuleIds,
      defaultFirewallAction: formData.defaultFirewallAction,
      isScheduled: formData.schedule.enabled,
      scheduleType: formData.schedule.enabled ? scheduleTypeReverseMap[formData.schedule.type] : 'NONE',
      scheduleStartTime:
        formData.schedule.enabled && (formData.schedule.type === 'time' || formData.schedule.type === 'both')
          ? formData.schedule.startTime
          : null,
      scheduleEndTime:
        formData.schedule.enabled && (formData.schedule.type === 'time' || formData.schedule.type === 'both')
          ? formData.schedule.endTime
          : null,
      scheduleDays:
        formData.schedule.enabled && (formData.schedule.type === 'time' || formData.schedule.type === 'both')
          ? formData.schedule.activeDays
          : [],
      geoLocationCountries:
        formData.schedule.enabled && (formData.schedule.type === 'geolocation' || formData.schedule.type === 'both')
          ? formData.schedule.geoCountries
          : [],
      autoActivate: formData.schedule.enabled ? formData.schedule.autoActivate : false
    };
  };

  const saveProfile = async () => {
    if (!formData.name.trim()) {
      setToast({ type: 'error', message: 'Profile name is required' });
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = payloadFromForm();
      if (editingProfile) {
        const response = await api.put(`/profiles/${editingProfile.id}`, payload);
        const updated = response.data?.profile;
        setProfiles((prev) => prev.map((item) => (item.id === editingProfile.id ? updated : item)));
        setToast({ type: 'success', message: 'Profile updated successfully' });
      } else {
        const response = await api.post('/profiles', payload);
        const created = response.data?.profile;
        setProfiles((prev) => [created, ...prev]);
        setToast({ type: 'success', message: 'Profile created successfully' });
      }

      const logsResponse = await api.get('/profiles/logs/all');
      setActivityLogs(logsResponse.data?.logs || []);

      setShowForm(false);
      resetForm();
    } catch (saveError) {
      setToast({ type: 'error', message: getErrorMessage(saveError, 'Failed to save profile') });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (profile) => {
    try {
      if (profile.isActive) {
        await api.put(`/profiles/${profile.id}/deactivate`, {});
        setToast({ type: 'success', message: 'Profile deactivated successfully' });
      } else {
        await api.put(`/profiles/${profile.id}/activate`, {});
        setToast({ type: 'success', message: 'Profile activated successfully' });
      }

      const [profilesRes, logsRes] = await Promise.all([api.get('/profiles'), api.get('/profiles/logs/all')]);
      setProfiles(profilesRes.data?.profiles || []);
      setActivityLogs(logsRes.data?.logs || []);
    } catch (actionError) {
      setToast({ type: 'error', message: getErrorMessage(actionError, 'Failed to update profile status') });
    }
  };

  const requestDelete = (profile) => {
    setDeleteTarget(profile);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/profiles/${deleteTarget.id}`);
      setProfiles((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToast({ type: 'success', message: 'Profile deleted successfully' });

      const logsRes = await api.get('/profiles/logs/all');
      setActivityLogs(logsRes.data?.logs || []);
    } catch (deleteError) {
      setToast({ type: 'error', message: getErrorMessage(deleteError, 'Failed to delete profile') });
    } finally {
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const openShareDialog = (profile) => {
    setShareTarget(profile);
    setShareForm({ permissions: 'VIEW', password: '', expiresInDays: '', maxAccess: '' });
    setShowShareDialog(true);
  };

  const openShareManagement = (profile) => {
    if (profile?.id && typeof window !== 'undefined') {
      window.sessionStorage.setItem('highlightShareProfileId', profile.id);
    }

    if (typeof window !== 'undefined' && typeof window.setCurrentView === 'function') {
      window.setCurrentView('share-management');
      return;
    }
    window.location.href = '/share-management';
  };

  const createShareLink = async () => {
    if (!shareTarget) return;

    try {
      const response = await api.post('/auth/shared-profiles', {
        profileId: shareTarget.id,
        permissions: shareForm.permissions,
        password: shareForm.password.trim() || undefined,
        expiresInDays: shareForm.expiresInDays ? parseInt(shareForm.expiresInDays, 10) : undefined,
        maxAccess: shareForm.maxAccess ? parseInt(shareForm.maxAccess, 10) : undefined
      });

      const created = response.data?.data;
      if (created?.shareToken) {
        const shareUrl = `${window.location.origin}/shared-profiles/${created.shareToken}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          setToast({ type: 'success', message: 'Share link created and copied to clipboard' });
        } catch {
          setToast({ type: 'success', message: 'Share link created successfully' });
        }
      }

      const sharesRes = await api.get('/auth/shared-profiles/my/shares');
      setShareLinks(sharesRes.data?.data || []);

      setShowShareDialog(false);
      setShareTarget(null);
    } catch (shareError) {
      setToast({ type: 'error', message: getErrorMessage(shareError, 'Failed to create share link') });
    }
  };

  const revokeShareLink = async (shareId) => {
    try {
      await api.put(`/auth/shared-profiles/${shareId}/revoke`);
      const sharesRes = await api.get('/auth/shared-profiles/my/shares');
      setShareLinks(sharesRes.data?.data || []);
      setToast({ type: 'success', message: 'Share link revoked successfully' });
    } catch (revokeError) {
      setToast({ type: 'error', message: getErrorMessage(revokeError, 'Failed to revoke share link') });
    }
  };

  const deleteShareLink = async (shareId) => {
    try {
      await api.delete(`/auth/shared-profiles/${shareId}`);
      setShareLinks((prev) => prev.filter((link) => link.id !== shareId));
      setToast({ type: 'success', message: 'Share link deleted successfully' });
    } catch (deleteError) {
      setToast({ type: 'error', message: getErrorMessage(deleteError, 'Failed to delete share link') });
    }
  };

  const toggleDay = (day) => {
    setFormData((prev) => {
      const hasDay = prev.schedule.activeDays.includes(day);
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          activeDays: hasDay
            ? prev.schedule.activeDays.filter((item) => item !== day)
            : [...prev.schedule.activeDays, day]
        }
      };
    });
  };

  const addCountry = (country) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        geoCountries: [...prev.schedule.geoCountries, country]
      }
    }));
    setGeoSearch('');
    setShowGeoDropdown(false);
  };

  const removeCountry = (country) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        geoCountries: prev.schedule.geoCountries.filter((item) => item !== country)
      }
    }));
  };

  if (loading) {
    return (
      <div style={{ color: colors.text, maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ margin: 0 }}>Loading Security Profile Manager...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', color: colors.text, backgroundColor: colors.bgMain, padding: '4px 0 20px' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 92,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${toast.type === 'error' ? colors.danger : colors.accent}`,
            backgroundColor: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : colors.accentSoft,
            color: toast.type === 'error' ? colors.danger : colors.text
          }}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 8,
            border: `1px solid ${colors.danger}`,
            backgroundColor: 'rgba(239,68,68,0.12)',
            color: colors.danger,
            padding: 12
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiLayers size={24} color={colors.accent} />
            Security Profile Manager
          </h1>
          <p style={{ margin: '6px 0 0 0', color: colors.textMuted }}>
            Create, manage, and deploy bundled security configurations
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            onClick={openCreate}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              backgroundColor: colors.accent,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FiPlus size={14} />
            Create New Profile
          </button>
          <button
            onClick={() => setShowActivityLogs((prev) => !prev)}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '8px 12px',
              backgroundColor: colors.bgCard,
              color: colors.text,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FiClock size={14} />
            {showActivityLogs ? 'Hide Activity Logs' : 'View Activity Logs'}
          </button>
          <button
            onClick={() => setShowManageSharesDialog(true)}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '8px 12px',
              backgroundColor: colors.bgCard,
              color: colors.text,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FiShare2 size={14} />
            Manage All Shares
            <span
              style={{
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                backgroundColor: isDark ? 'rgba(30,140,74,0.25)' : '#dcfce7',
                color: colors.accent
              }}
            >
              {totalShares}
            </span>
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.textMuted }}>
          <FiShield size={14} />
          {activeCount} of {profiles.length} profiles active
        </div>
      </div>

      {showActivityLogs && (
        <div
          style={{
            marginBottom: 14,
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 16
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FiActivity size={18} color={colors.accent} />
              Activity Log
            </h3>
            <button
              onClick={() => setShowActivityLogs(false)}
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                color: colors.text,
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <FiX size={14} />
            </button>
          </div>

          <div style={{ marginTop: 12, maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {activityLogs.length === 0 && <div style={{ color: colors.textMuted }}>No activity yet.</div>}
            {activityLogs.map((log) => {
              const tone = getActionColor(log.action, isDark);
              return (
                <div
                  key={log.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 10,
                    backgroundColor: colors.bgPanel,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start'
                  }}
                >
                  <span
                    style={{
                      borderRadius: 999,
                      padding: '3px 8px',
                      fontSize: 11,
                      color: tone.fg,
                      backgroundColor: tone.bg,
                      border: `1px solid ${tone.fg}`
                    }}
                  >
                    {toTitle(log.action)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>
                      <span style={{ color: colors.accent, fontWeight: 500 }}>
                        {log.profile?.name || 'Unknown Profile'}
                      </span>
                    </div>
                    {log.description && (
                      <div style={{ marginTop: 2, fontSize: 12, color: colors.textMuted }}>{log.description}</div>
                    )}
                    <div style={{ marginTop: 4, fontSize: 11, color: colors.textMuted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiClock size={11} />{formatDateTime(log.createdAt)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiMail size={11} />{log.userEmail || 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div
          style={{
            marginBottom: 14,
            backgroundColor: colors.bgCard,
            border: `1px solid ${isDark ? '#14532d' : '#bbf7d0'}`,
            borderRadius: 14,
            padding: 16
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {editingProfile ? <FiEdit2 size={18} color={colors.accent} /> : <FiPlus size={18} color={colors.accent} />}
                {editingProfile ? 'Edit Profile' : 'Create New Profile'}
              </h3>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                Configure VPN, firewall and scheduling rules
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                color: colors.text
              }}
            >
              <FiX size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FiInfo size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                Basic Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Profile Name *</label>
                  <input
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g., Corporate Office Standard"
                    style={{
                      width: '100%',
                      marginTop: 4,
                      borderRadius: 8,
                      border: `1px solid ${colors.inputBorder}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      padding: '9px 10px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Profile Type</label>
                  <select
                    value={formData.profileType}
                    onChange={(event) => setFormData((prev) => ({ ...prev, profileType: event.target.value }))}
                    style={{
                      width: '100%',
                      marginTop: 4,
                      borderRadius: 8,
                      border: `1px solid ${colors.inputBorder}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      padding: '9px 10px'
                    }}
                  >
                    {profileTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: colors.textMuted }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                  placeholder="Describe profile purpose..."
                  style={{
                    width: '100%',
                    marginTop: 4,
                    borderRadius: 8,
                    border: `1px solid ${colors.inputBorder}`,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    padding: '9px 10px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FiWifi size={14} color={colors.accent} />
                  VPN Settings
                </h4>
                <label style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={formData.vpnEnabled}
                    onChange={(event) => setFormData((prev) => ({ ...prev, vpnEnabled: event.target.checked }))}
                  />
                  Enable VPN
                </label>
              </div>

              {formData.vpnEnabled && (
                <div
                  style={{
                    marginTop: 10,
                    backgroundColor: colors.bgPanel,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 10,
                    display: 'grid',
                    gap: 10
                  }}
                >
                  <div>
                    <label style={{ fontSize: 12, color: colors.textMuted }}>Select VPN Configuration</label>
                    <select
                      value={formData.vpnServer}
                      onChange={(event) => {
                        const selectedVal = event.target.value;
                        const selectedVpn = vpnConfigs.find(v => String(v.id) === selectedVal || String(v.name) === selectedVal);
                        
                        setFormData((prev) => ({
                          ...prev,
                          vpnServer: selectedVal,
                          vpnProtocol: selectedVpn ? selectedVpn.protocol : 'OpenVPN'
                        }));
                      }}
                      style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                    >
                      <option value="">-- Choose a VPN Configuration --</option>
                      {vpnConfigs.map((vpn) => (
                        <option key={vpn.id} value={vpn.id || vpn.name}>
                          {vpn.name} ({vpn.protocol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FiShield size={14} color={isDark ? '#60a5fa' : '#2563eb'} />
                Firewall Rule Selection
              </h4>
              <div>
                <label style={{ fontSize: 12, color: colors.textMuted }}>Select Rules</label>
                <div style={{ marginTop: 4, maxHeight: 160, overflowY: 'auto', border: `1px solid ${colors.inputBorder}`, borderRadius: 8, backgroundColor: colors.inputBg, padding: 8 }}>
                  {firewallRulesets.map((rule) => {
                    const isChecked = formData.firewallRuleIds.includes(String(rule.id));
                    return (
                      <label key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, firewallRuleIds: [...prev.firewallRuleIds, String(rule.id)] }));
                            } else {
                              setFormData(prev => ({ ...prev, firewallRuleIds: prev.firewallRuleIds.filter(id => id !== String(rule.id)) }));
                            }
                          }}
                        />
                        {formatFirewallRule(rule)}
                      </label>
                    );
                  })}
                  {firewallRulesets.length === 0 && <div style={{ fontSize: 13, color: colors.textMuted }}>No firewall rules available.</div>}
                </div>
              </div>

              {formData.firewallRuleIds.length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Selected Rules Details</label>
                  {formData.firewallRuleIds.map(ruleId => {
                    const selected = firewallRulesets.find((rule) => String(rule.id) === String(ruleId));
                    if (!selected) return null;
                    return (
                      <div key={ruleId} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 10, backgroundColor: colors.bgPanel }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <strong>{selected.name || formatFirewallRule(selected)}</strong>
                          <span style={{ fontSize: 11, color: colors.textMuted }}>{getFirewallActionName(selected.action)}</span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: colors.textMuted }}>
                          {selected.description || 'No description provided'}
                        </div>
                        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, fontSize: 11 }}>
                          <div><span style={{ color: colors.textMuted }}>Protocol:</span> {getFirewallProtocolName(selected.protocol)}</div>
                          <div><span style={{ color: colors.textMuted }}>Direction:</span> {selected.direction || 'Any'}</div>
                          <div><span style={{ color: colors.textMuted }}>IP Address:</span> {selected.ip_address || selected.source || 'Any'}</div>
                          <div><span style={{ color: colors.textMuted }}>Ports:</span> {(selected.port_start === selected.port_end || !selected.port_end) ? selected.port_start : `${selected.port_start}-${selected.port_end}`}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FiCalendar size={14} color={isDark ? '#c084fc' : '#9333ea'} />
                  Scheduling
                </h4>
                <label style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={formData.schedule.enabled}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        schedule: { ...prev.schedule, enabled: event.target.checked }
                      }))
                    }
                  />
                  Enable Scheduling
                </label>
              </div>

              {formData.schedule.enabled && (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: colors.textMuted }}>Schedule Type</label>
                    <select
                      value={formData.schedule.type}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, type: event.target.value }
                        }))
                      }
                      style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                    >
                      <option value="none">None</option>
                      <option value="time">Time-Based</option>
                      <option value="geolocation">Condition / Geolocation</option>
                      <option value="both">Both (Time + Geolocation)</option>
                    </select>
                  </div>

                  {(formData.schedule.type === 'time' || formData.schedule.type === 'both') && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, color: colors.textMuted }}>Start Time</label>
                          <input
                            type="time"
                            value={formData.schedule.startTime}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                schedule: { ...prev.schedule, startTime: event.target.value }
                              }))
                            }
                            style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: colors.textMuted }}>End Time</label>
                          <input
                            type="time"
                            value={formData.schedule.endTime}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                schedule: { ...prev.schedule, endTime: event.target.value }
                              }))
                            }
                            style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, color: colors.textMuted }}>Active Days</label>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {daysOfWeek.map((day) => {
                            const active = formData.schedule.activeDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                style={{
                                  borderRadius: 8,
                                  border: active ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                  backgroundColor: active ? colors.accentSoft : colors.bgCard,
                                  color: active ? colors.accent : colors.text,
                                  padding: '5px 10px',
                                  cursor: 'pointer'
                                }}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {(formData.schedule.type === 'geolocation' || formData.schedule.type === 'both') && (
                    <div ref={geoInputRef}>
                      <label style={{ fontSize: 12, color: colors.textMuted }}>Allowed Countries</label>
                      <input
                        value={geoSearch}
                        onChange={(event) => {
                          setGeoSearch(event.target.value);
                          setShowGeoDropdown(true);
                        }}
                        onFocus={() => setShowGeoDropdown(true)}
                        placeholder="Search countries..."
                        style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                      />

                      {showGeoDropdown && filteredCountries.length > 0 && (
                        <div
                          style={{
                            marginTop: 4,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            backgroundColor: colors.bgCard,
                            maxHeight: 170,
                            overflowY: 'auto'
                          }}
                        >
                          {filteredCountries.slice(0, 10).map((country) => (
                            <button
                              key={country}
                              type="button"
                              onClick={() => addCountry(country)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                borderBottom: `1px solid ${colors.border}`,
                                backgroundColor: 'transparent',
                                color: colors.text,
                                padding: '8px 10px',
                                cursor: 'pointer'
                              }}
                            >
                              {country}
                            </button>
                          ))}
                        </div>
                      )}

                      {formData.schedule.geoCountries.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {formData.schedule.geoCountries.map((country) => (
                            <span
                              key={country}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 999,
                                border: `1px solid ${colors.accent}`,
                                backgroundColor: colors.accentSoft,
                                color: colors.accent,
                                fontSize: 12,
                                padding: '3px 8px'
                              }}
                            >
                              <FiMapPin size={11} />
                              {country}
                              <button
                                type="button"
                                onClick={() => removeCountry(country)}
                                style={{ border: 'none', backgroundColor: 'transparent', color: colors.accent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <FiX size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <label style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={formData.schedule.autoActivate}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, autoActivate: event.target.checked }
                        }))
                      }
                    />
                    Auto-activate when schedule conditions are met
                  </label>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '9px 14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                style={{ border: 'none', borderRadius: 8, backgroundColor: colors.accent, color: '#fff', padding: '9px 14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                <FiCheckCircle size={14} />
                {saving ? 'Saving...' : editingProfile ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <FiSearch size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search profiles by name or description..."
            style={{ width: '100%', borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '9px 10px 9px 32px' }}
          />
        </div>
        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          style={{ borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '9px 10px' }}
        >
          <option value="all">All Types</option>
          {profileTypeOptions.map((type) => (
            <option key={type} value={type.toLowerCase()}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          style={{ borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '9px 10px' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filteredProfiles.length === 0 ? (
        <div
          style={{
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              margin: '0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? '#374151' : '#f3f4f6'
            }}
          >
            <FiLayers size={30} color={isDark ? '#6b7280' : '#9ca3af'} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {profiles.length === 0 ? 'No Security Profiles' : 'No Matching Profiles'}
          </div>
          <div style={{ marginTop: 6, color: colors.textMuted }}>
            {profiles.length === 0
              ? 'Create your first profile to bundle VPN, firewall and scheduling rules.'
              : 'Try adjusting your search or filters.'}
          </div>
          {profiles.length === 0 && (
            <button
              onClick={openCreate}
              style={{
                marginTop: 10,
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                backgroundColor: colors.accent,
                color: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FiPlus size={14} />
              Create First Profile
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 12 }}>
          {filteredProfiles.map((profile) => {
            const activeRulesCount = Array.isArray(profile.firewallRules) ? profile.firewallRules.length : 0;

            const linkedShares = shareLinks.filter(
              (link) => String(link.profileId) === String(profile.id) && link.isActive && !link.revokedAt
            );

            const scheduleType = scheduleTypeMap[profile.scheduleType] || 'none';
            const scheduleLabel =
              scheduleType === 'time'
                ? 'Timed'
                : scheduleType === 'geolocation'
                  ? 'Geo'
                  : scheduleType === 'both'
                    ? 'Time+Geo'
                    : 'No Schedule';
            const statusTone = profile.isActive
              ? { bg: isDark ? 'rgba(22,163,74,0.28)' : '#dcfce7', fg: isDark ? '#4ade80' : '#15803d' }
              : { bg: isDark ? '#374151' : '#f3f4f6', fg: isDark ? '#9ca3af' : '#4b5563' };
            const typeTone = getTypeColor(profile.profileType, isDark);
            const vpnTone = getFeatureTone(profile.vpnEnabled, 'vpn', isDark);
            const fwTone = getFeatureTone(activeRulesCount > 0, 'firewall', isDark);
            const schTone = getFeatureTone(profile.isScheduled, 'schedule', isDark);

            return (
              <div
                key={profile.id}
                style={{
                  backgroundColor: profile.isActive ? (isDark ? 'rgba(22,163,74,0.05)' : 'rgba(240,253,244,0.7)') : colors.bgCard,
                  border: profile.isActive ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{profile.name}</h3>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '3px 8px',
                          fontSize: 11,
                          border: `1px solid ${profile.isActive ? colors.accent : colors.border}`,
                          backgroundColor: statusTone.bg,
                          color: statusTone.fg
                        }}
                      >
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        style={{
                          borderRadius: 8,
                          padding: '3px 8px',
                          fontSize: 11,
                          border: `1px solid ${typeTone.fg}`,
                          color: typeTone.fg,
                          backgroundColor: typeTone.bg
                        }}
                      >
                        {profile.profileType}
                      </span>
                    </div>
                    <p style={{ margin: '7px 0 0 0', color: colors.textMuted, fontSize: 13 }}>
                      {profile.description || 'No description'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.textMuted, padding: '6px 9px', cursor: 'pointer', display: 'inline-flex', justifyContent: 'center' }}
                    >
                      <FiMoreVertical size={14} />
                    </button>
                    <button
                      onClick={() => openEdit(profile)}
                      style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '6px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <FiEdit2 size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => openShareDialog(profile)}
                      style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '6px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <FiShare2 size={13} />
                      Share
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7 }}>
                  <div
                    style={{
                      borderRadius: 8,
                      padding: '7px 8px',
                      fontSize: 12,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: vpnTone.bg,
                      color: vpnTone.fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {profile.vpnEnabled ? <FiWifi size={13} /> : <FiWifiOff size={13} />}
                    VPN {profile.vpnEnabled ? `(${profile.vpnProtocol || 'On'})` : 'Off'}
                  </div>
                  <div
                    style={{
                      borderRadius: 8,
                      padding: '7px 8px',
                      fontSize: 12,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: fwTone.bg,
                      color: fwTone.fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiShield size={13} />
                    {activeRulesCount > 0 ? `${activeRulesCount} Rule${activeRulesCount > 1 ? 's' : ''}` : 'Default Firewall'}
                  </div>
                  <div
                    style={{
                      borderRadius: 8,
                      padding: '7px 8px',
                      fontSize: 12,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: schTone.bg,
                      color: schTone.fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiClock size={13} />
                    {scheduleLabel}
                  </div>
                </div>

                <div style={{ marginTop: 9, fontSize: 11, color: colors.textMuted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiCalendar size={11} />Created {formatDateOnly(profile.createdAt)}</span>
                  {profile.lastActivatedAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiZap size={11} />Last active {formatDateTime(profile.lastActivatedAt)}</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiActivity size={11} />{profile.activationCount || 0} activations</span>
                  {linkedShares.length > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiUsers size={11} />{linkedShares.length} active shares</span>}
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => toggleActive(profile)}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 11px',
                      backgroundColor: profile.isActive ? '#4b5563' : colors.accent,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {profile.isActive ? <FiZapOff size={13} /> : <FiPower size={13} />}
                    {profile.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(profile)}
                    style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '7px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FiEdit2 size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(profile)}
                    style={{ border: `1px solid ${colors.danger}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.danger, padding: '7px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FiTrash2 size={13} />
                    Delete
                  </button>
                  <button
                    onClick={() => openShareManagement(profile)}
                    style={{ marginLeft: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '7px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <FiShare2 size={13} />
                    Share Link Management
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDeleteDialog && (
        <Modal
          onClose={() => {
            setShowDeleteDialog(false);
            setDeleteTarget(null);
          }}
        >
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 12, border: `1px solid ${colors.danger}`, backgroundColor: colors.bgCard, padding: 18 }}>
            <h3 style={{ margin: 0, color: colors.danger, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FiAlertTriangle size={18} />
              Delete Security Profile
            </h3>
            <p style={{ color: colors.textMuted, marginTop: 8 }}>
              This action cannot be undone. The profile and related configurations will be removed.
            </p>
            {deleteTarget && (
              <div style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`, backgroundColor: isDark ? 'rgba(127,29,29,0.2)' : '#fef2f2', color: isDark ? '#fca5a5' : '#991b1b', padding: 10, fontSize: 13 }}>
                You are deleting <strong>"{deleteTarget.name}"</strong>
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteTarget(null);
                }}
                style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '8px 12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ border: 'none', borderRadius: 8, backgroundColor: '#dc2626', color: '#fff', padding: '8px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                <FiTrash2 size={13} />
                Delete Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showShareDialog && shareTarget && (
        <Modal
          onClose={() => {
            setShowShareDialog(false);
            setShareTarget(null);
          }}
        >
          <div style={{ width: '100%', maxWidth: 620, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, padding: 18 }}>
            <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FiShare2 size={18} color={colors.accent} />
              Share Profile: {shareTarget.name}
            </h3>
            <p style={{ marginTop: 8, color: colors.textMuted }}>
              Create a secure share link. VPN credentials are never shared.
            </p>

            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: colors.textMuted }}>Permission</label>
                <select
                  value={shareForm.permissions}
                  onChange={(event) => setShareForm((prev) => ({ ...prev, permissions: event.target.value }))}
                  style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                >
                  <option value="VIEW">View Only</option>
                  <option value="IMPORT">View & Import</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Password (optional)</label>
                  <input
                    type="password"
                    value={shareForm.password}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, password: event.target.value }))}
                    style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Expires in Days</label>
                  <input
                    value={shareForm.expiresInDays}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, expiresInDays: event.target.value }))}
                    style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: colors.textMuted }}>Max Access Count</label>
                  <input
                    value={shareForm.maxAccess}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, maxAccess: event.target.value }))}
                    style={{ width: '100%', marginTop: 4, borderRadius: 8, border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text, padding: '8px 10px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => {
                  setShowShareDialog(false);
                  setShareTarget(null);
                }}
                style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '8px 12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={createShareLink}
                style={{ border: 'none', borderRadius: 8, backgroundColor: colors.accent, color: '#fff', padding: '8px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                <FiShare2 size={13} />
                Create Share Link
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showManageSharesDialog && (
        <Modal onClose={() => setShowManageSharesDialog(false)}>
          <div style={{ width: '100%', maxWidth: 840, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, padding: 18 }}>
            <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FiUsers size={18} color={colors.accent} />
              Manage All Shares
            </h3>
            <p style={{ marginTop: 8, color: colors.textMuted }}>View and control all generated profile share links.</p>

            <div style={{ marginTop: 12, maxHeight: 420, overflowY: 'auto', display: 'grid', gap: 8 }}>
              {shareLinks.length === 0 ? (
                <div style={{ color: colors.textMuted, padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiShare2 size={20} color={isDark ? '#6b7280' : '#d1d5db'} />
                  No share links created yet.
                </div>
              ) : (
                shareLinks.map((link) => {
                  const profileName =
                    link.profile?.name || profiles.find((item) => String(item.id) === String(link.profileId))?.name || 'Unknown Profile';
                  const isRevoked = !link.isActive || Boolean(link.revokedAt);

                  return (
                    <div key={link.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, backgroundColor: colors.bgPanel, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{profileName}</div>
                          <div style={{ marginTop: 3, fontSize: 12, color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <FiMail size={12} />
                            Permission: {link.permissions} • Access: {link.accessCount || 0}
                            {link.maxAccess ? `/${link.maxAccess}` : ''}
                          </div>
                          <div style={{ marginTop: 3, fontSize: 11, color: colors.textMuted }}>
                            Created {formatDateTime(link.createdAt)}
                            {link.expiresAt ? ` • Expires ${formatDateTime(link.expiresAt)}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${isRevoked ? colors.danger : colors.accent}`,
                              backgroundColor: isRevoked ? 'rgba(239,68,68,0.15)' : colors.accentSoft,
                              color: isRevoked ? colors.danger : colors.accent,
                              fontSize: 11,
                              padding: '3px 8px'
                            }}
                          >
                            {isRevoked ? 'Revoked' : 'Active'}
                          </span>

                          {!isRevoked && (
                            <button
                              onClick={() => revokeShareLink(link.id)}
                              style={{ border: `1px solid ${colors.warning}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.warning, padding: '6px 10px', cursor: 'pointer' }}
                            >
                              Revoke
                            </button>
                          )}

                          <button
                            onClick={() => deleteShareLink(link.id)}
                            style={{ border: `1px solid ${colors.danger}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.danger, padding: '6px 10px', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowManageSharesDialog(false)}
                style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: 'transparent', color: colors.text, padding: '8px 12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProfileManager;
