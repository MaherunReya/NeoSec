import React from 'react';
import {
  FiCreditCard,
  FiGrid,
  FiLock,
  FiLogOut,
  FiMenu,
  FiShield,
  FiWifi,
  FiX
} from 'react-icons/fi';

const PRIMARY_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { key: 'vpn', label: 'VPN', icon: FiWifi },
  { key: 'firewall', label: 'Firewall', icon: FiShield },
  { key: 'profiles', label: 'Profiles', icon: FiLock },
  { key: 'subscription', label: 'Subscription', icon: FiCreditCard }
];

function Sidebar({ user, palette, currentView, setCurrentView, isMobile, sidebarOpen, setSidebarOpen, handleLogout }) {
  const sidebarWidth = isMobile ? (sidebarOpen ? 240 : 0) : 72;

  return (
    <>
      {isMobile && !sidebarOpen && (
        <button
          className="mobile-menu-button"
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1001,
            width: 40,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.bgCard,
            color: palette.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FiMenu size={18} />
        </button>
      )}

      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 999
          }}
        />
      )}

      <aside
        className="sidebar-container"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: sidebarWidth,
          backgroundColor: '#111827',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          zIndex: 1000,
          transition: 'width 0.28s ease, transform 0.28s ease',
          transform: isMobile && !sidebarOpen ? 'translateX(-240px)' : 'translateX(0)',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
          {isMobile && sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                alignSelf: 'flex-end',
                border: 'none',
                background: 'transparent',
                color: '#d1d5db',
                cursor: 'pointer',
                marginBottom: 8
              }}
            >
              <FiX size={18} />
            </button>
          )}

          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="NeoSec"
          >
            <FiShield size={20} />
          </button>

          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
            <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PRIMARY_ITEMS.map((item) => {
                const active = currentView === item.key;
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    onClick={() => setCurrentView(item.key)}
                    title={item.label}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 12,
                      padding: '8px 4px',
                      backgroundColor: active ? '#16a34a' : 'transparent',
                      color: active ? '#fff' : '#9ca3af',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      boxShadow: active ? '0 10px 18px rgba(22,163,74,0.30)' : 'none',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <Icon size={17} />
                    <span style={{ fontSize: 10, lineHeight: 1.15, textAlign: 'center' }}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setCurrentView('account-settings')}
              title="Account Settings"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: '1px solid rgba(74,222,128,0.35)',
                backgroundColor: 'rgba(22,163,74,0.22)',
                color: '#4ade80',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {String(user?.email || 'U').charAt(0).toUpperCase()}
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: 34,
                height: 30,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                backgroundColor: 'transparent',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <FiLogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
