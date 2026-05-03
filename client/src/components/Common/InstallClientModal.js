import React from 'react';
import { FiDownload, FiTerminal } from 'react-icons/fi';

const InstallClientModal = ({ isOpen, onClose, theme, palette }) => {
    if (!isOpen) return null;

    const colors = palette || {};

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            opacity: 1,
            transition: 'opacity 0.3s ease'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: colors.bgCard,
                padding: '32px',
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                width: '90%',
                maxWidth: '500px',
                boxShadow: theme === 'light'
                    ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: colors.textMuted,
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px'
                    }}
                >
                    ×
                </button>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: theme === 'light' ? '#fee2e2' : 'rgba(212,24,61,0.1)',
                        color: colors.danger,
                        marginBottom: '16px'
                    }}>
                        <FiDownload size={32} />
                    </div>
                    <h2 style={{ color: colors.text, margin: '0 0 12px 0', fontSize: '24px' }}>Desktop Client Required</h2>
                    <p style={{ color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                        To apply these settings to your system, the NeoSec Desktop Client must be installed and running.
                    </p>
                </div>

                <div style={{
                    backgroundColor: colors.bgPanel,
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    marginBottom: '24px'
                }}>
                    <p style={{ color: colors.text, margin: '0 0 12px 0', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiTerminal /> Installation Command
                    </p>
                    <code style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: '#0a0a0a',
                        color: '#4ade80',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        wordBreak: 'break-all'
                    }}>
                        # Install and run the python client:
                        cd neosec-desktop
                        bash scripts/install.sh
                        python -m neosec.main
                    </code>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: colors.accent,
                        color: theme === 'dark' ? '#121212' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '15px'
                    }}
                >
                    I Understand
                </button>
            </div>
        </div>
    );
};

export default InstallClientModal;
