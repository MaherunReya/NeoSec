import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiChevronDown,
  FiCpu,
  FiList,
  FiMap,
  FiMoon,
  FiSearch,
  FiSettings,
  FiShield,
  FiSliders,
  FiSun,
  FiUsers,
  FiUser,
  FiZap
} from 'react-icons/fi';

function DropdownGroup({ group, activeView, onNavigate, openKey, setOpenKey }) {
  const isOpen = openKey === group.key;
  const isActive = group.items.some((item) => item.view === activeView);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpenKey(isOpen ? null : group.key)}
        style={{
          border: 'none',
          borderRadius: 10,
          backgroundColor: isActive ? 'rgba(22,163,74,0.20)' : 'transparent',
          color: isActive ? '#4ade80' : '#d1d5db',
          padding: '7px 10px',
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer'
        }}
      >
        {group.label}
        <FiChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            minWidth: 220,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(17,24,39,0.96)',
            boxShadow: '0 20px 34px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            zIndex: 60
          }}
        >
          {group.items.map((item) => {
            const active = activeView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate(item.view);
                  setOpenKey(null);
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  backgroundColor: active ? 'rgba(22,163,74,0.18)' : 'transparent',
                  color: active ? '#4ade80' : '#e5e7eb',
                  cursor: 'pointer'
                }}
              >
                <Icon size={14} color={active ? '#4ade80' : '#9ca3af'} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FloatingTopNav({ user, currentView, setCurrentView, isMobile, theme, setTheme }) {
  const [openKey, setOpenKey] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) {
        setOpenKey(null);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const groups = useMemo(() => {
    const base = [
      {
        key: 'admin',
        label: 'Admin',
        items: [
          { view: 'users', label: 'User Management', icon: FiUsers },
          { view: 'audit', label: 'Audit Trail', icon: FiList },
          { view: 'role-templates', label: 'Role Templates', icon: FiSliders },
          { view: 'impersonation', label: 'Impersonation', icon: FiUser },
          { view: 'admin-notifications', label: 'Admin Notifications', icon: FiBell }
        ]
      },
      {
        key: 'monitoring',
        label: 'Monitoring',
        items: [
          { view: 'system-health', label: 'System Health', icon: FiCpu },
          { view: 'devices', label: 'Device Inventory', icon: FiShield },
          { view: 'login-history', label: 'Login History', icon: FiActivity },
          { view: 'activity-logs', label: 'Logs & Reporting', icon: FiBarChart2 }
        ]
      },
      {
        key: 'threats',
        label: 'Threats & Analytics',
        items: [
          { view: 'threat-blocker', label: 'Threat Blocker', icon: FiZap },
          { view: 'scan', label: 'URL Scanner', icon: FiSearch },
          { view: 'share-management', label: 'Share Management', icon: FiMap }
        ]
      },
      {
        key: 'advanced',
        label: 'Advanced',
        items: [
          { view: 'feature-toggles', label: 'Feature Toggles', icon: FiSettings }
        ]
      }
    ];

    return base
      .map((group) => {
        if (user?.role !== 'admin' && group.key === 'admin') return { ...group, items: [] };
        if (user?.role !== 'admin' && group.key === 'advanced') return { ...group, items: [] };
        if (user?.role === 'user' && group.key === 'monitoring') {
          return {
            ...group,
            items: group.items.filter(
              (item) => !['system-health', 'devices', 'login-history'].includes(item.view)
            )
          };
        }
        return group;
      })
      .filter((group) => group.items.length > 0);
  }, [user]);

  const hierarchyItems = useMemo(() => {
    const items = [
      { view: 'invitations', label: 'Invitations' },
      { view: 'memberships', label: 'Memberships' }
    ];

    if (user?.accountType === 'leader') {
      return [{ view: 'groups', label: 'My Groups' }, ...items];
    }

    return items;
  }, [user]);

  if (isMobile) return null;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed',
        top: 14,
        left: 90,
        right: 16,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderRadius: 18,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 20px 30px rgba(0,0,0,0.28)',
          backgroundColor: 'rgba(17,24,39,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
      >
        {groups.map((group) => (
          <DropdownGroup
            key={group.key}
            group={group}
            activeView={currentView}
            onNavigate={setCurrentView}
            openKey={openKey}
            setOpenKey={setOpenKey}
          />
        ))}

        {hierarchyItems.length > 0 && (
          <DropdownGroup
            group={{ key: 'hierarchy', label: 'Hierarchy', items: hierarchyItems.map((item) => ({ ...item, icon: FiUsers })) }}
            activeView={currentView}
            onNavigate={setCurrentView}
            openKey={openKey}
            setOpenKey={setOpenKey}
          />
        )}

        <div style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.16)', margin: '0 2px' }} />

        <button
          onClick={() => {
            setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
            setOpenKey(null);
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            border: 'none',
            borderRadius: 10,
            backgroundColor: 'transparent',
            color: '#d1d5db',
            padding: '7px 10px',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <FiSun size={13} /> : <FiMoon size={13} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        <button
          onClick={() => {
            setCurrentView('account-settings');
            setOpenKey(null);
          }}
          style={{
            border: 'none',
            borderRadius: 10,
            backgroundColor: currentView === 'account-settings' ? 'rgba(22,163,74,0.20)' : 'transparent',
            color: currentView === 'account-settings' ? '#4ade80' : '#d1d5db',
            padding: '7px 10px',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <FiUser size={13} />
          Account
        </button>
      </div>
    </div>
  );
}

export default FloatingTopNav;
