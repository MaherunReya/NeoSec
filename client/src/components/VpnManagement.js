import React, { useEffect, useState } from 'react';
import vpnAPI from '../services/vpnAPI';
import { MdModeEdit, MdDownload } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { HiDocumentDuplicate } from 'react-icons/hi';
import InstallClientModal from './Common/InstallClientModal';

const VpnManagement = ({ theme = 'light', palette = null }) => {
    /* ===================== THEME ===================== */
    const darkPalette = {
        bgMain: '#121212',
        bgCard: '#181818',
        bgPanel: '#0a0a0a',
        text: '#ffffff',
        textMuted: '#9aa3b5',
        border: '#242424',
        accent: '#1E8C4A',
        accentSoft: 'rgba(30,140,74,0.12)',
        danger: '#e04848'
    };

    const lightPalette = {
        bgMain: '#f6f8fb',
        bgCard: '#ffffff',
        bgPanel: '#eef3f8',
        text: '#0b172a',
        textMuted: '#5b6b7a',
        border: '#d9e2ec',
        accent: '#1fa45a',
        accentSoft: '#e6f4ed',
        danger: '#d4183d'
    };

    const colors = palette || (theme === 'light' ? lightPalette : darkPalette);
    const isMobile = window.innerWidth < 768;

    /* ===================== STATE ===================== */
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionButtonHover, setActionButtonHover] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [fileError, setFileError] = useState('');
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [connectingId, setConnectingId] = useState(null); // id of VPN currently being toggled
    const [toasts, setToasts] = useState([]);

    const initialForm = {
        name: '',
        protocol: 'OpenVPN',
        description: '',
        configFileName: '',
        configFileContent: ''
    };

    const [form, setForm] = useState(initialForm);

    /* ===================== TOASTS ===================== */
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    /* ===================== FETCH ===================== */
    const loadConfigs = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await vpnAPI.getConfigs();
            if (res.success) setConfigs(res.data || []);
            else setError(res.message);
        } catch (e) {
            console.error('Load configs error:', e);
            setError(e?.response?.data?.message || e?.message || 'Failed to load VPN configs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    /* ===================== MODAL ===================== */
    const openCreate = () => {
        setEditingId(null);
        setForm(initialForm);
        setFileError('');
        setError('');
        setShowModal(true);
    };

    const openEdit = async (cfg) => {
        try {
            setError('');
            const res = await vpnAPI.getConfig(cfg.id);
            if (res.success) {
                setEditingId(cfg.id);
                setForm({
                    name: res.data.name,
                    protocol: res.data.protocol,
                    description: res.data.description || '',
                    configFileName: res.data.configFileName,
                    configFileContent: res.data.configFileContent
                });
                setShowModal(true);
            }
        } catch (e) {
            console.error('Load config error:', e);
            setError(e?.response?.data?.message || 'Failed to load VPN config');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setForm(initialForm);
        setFileError('');
        setError('');
    };

    /* ===================== FORM ===================== */
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const ext = form.protocol === 'OpenVPN' ? '.ovpn' : '.conf';
        if (!file.name.endsWith(ext)) {
            setFileError(`Invalid file type. Expected ${ext}`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setForm((p) => ({
                ...p,
                configFileName: file.name,
                configFileContent: reader.result
            }));
            setFileError('');
        };
        reader.readAsText(file);
    };

    const saveConfig = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) return setFileError('Name required');
        if (!editingId && !form.configFileContent)
            return setFileError('Config file required');

        try {
            const payload = {
                name: form.name.trim(),
                protocol: form.protocol,
                description: form.description || null,
                configFileName: form.configFileName,
                configFileContent: form.configFileContent
            };

            let res;
            if (editingId) {
                res = await vpnAPI.updateConfig(editingId, payload);
                if (res.success)
                    setConfigs((p) =>
                        p.map((c) => (c.id === editingId ? res.data : c))
                    );
            } else {
                res = await vpnAPI.createConfig(payload);
                if (res.success) setConfigs((p) => [res.data, ...p]);
            }

            if (!res.success) throw new Error(res.message);
            closeModal();
        } catch (e) {
            console.error('Save config error:', e);
            setError(e?.response?.data?.message || e?.message || 'Save failed');
        }
    };

    /* ===================== ACTIONS ===================== */
    const removeConfig = async (id) => {
        if (!window.confirm('Delete this VPN config?')) return;
        try {
            setError('');
            await vpnAPI.deleteConfig(id);
            setConfigs((p) => p.filter((c) => c.id !== id));
        } catch (e) {
            console.error('Delete config error:', e);
            setError(e?.response?.data?.message || e?.message || 'Failed to delete VPN config');
        }
    };

    const toggleConfig = async (id) => {
        if (connectingId) return; // prevent double-click while one is in flight
        setConnectingId(id);
        showToast("Your request is being processed…", 'info');
        try {
            setError('');
            const res = await vpnAPI.toggleConfig(id);
            if (res.success) {
                // Only update UI state on confirmed server success
                setConfigs((p) =>
                    p.map((c) =>
                        c.id === id
                            ? { ...c, isActive: res.data.isActive }
                            : { ...c, isActive: false }
                    )
                );
                const nowActive = res.data?.isActive;
                showToast(nowActive ? 'VPN connected successfully!' : 'VPN disconnected.', 'success');
            } else {
                showToast(res.message || 'Connection failed, please try again. Ensure that your desktop is on.', 'error');
            }
        } catch (e) {
            console.error('Toggle config error:', e);
            const errData = e.response?.data || e;
            if (errData.code === 'REQUIRE_DESKTOP_CLIENT') {
                setShowInstallModal(true);
            } else {
                showToast(
                    errData.message || 'Connection failed, please try again. Ensure that your desktop is on.',
                    'error'
                );
            }
            
            // Sync UI with DB state if server returned current state on failure
            if (errData.data && errData.data.isActive !== undefined) {
                setConfigs((p) =>
                    p.map((c) =>
                        c.id === id
                            ? { ...c, isActive: errData.data.isActive }
                            : { ...c, isActive: false }
                    )
                );
            }
        } finally {
            setConnectingId(null);
        }
    };

    const cloneConfig = async (id) => {
        try {
            setError('');
            const res = await vpnAPI.cloneConfig(id);
            if (res.success) setConfigs((p) => [res.data, ...p]);
            else throw new Error(res.message || 'Clone failed');
        } catch (e) {
            console.error('Clone config error:', e);
            setError(e?.response?.data?.message || e?.message || 'Failed to clone VPN config');
        }
    };

    const downloadConfig = async (id, name) => {
        try {
            setError('');
            const data = await vpnAPI.downloadConfig(id);
            const blob = new Blob([data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download config error:', e);
            setError(e?.response?.data?.message || e?.message || 'Failed to download VPN config');
        }
    };

    /* ===================== UI ===================== */
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: isMobile ? 18 : 24, color: colors.text }}>VPN Configuration</h1>
                <button onClick={openCreate}
                    style={{
                        padding: '10px 20px',
                        background: colors.accent,
                        color: theme === 'dark' ? '#121212' : '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}>
                    + Add VPN
                </button>
            </div>

            {error && <div style={{ 
                color: colors.danger, 
                marginBottom: 16,
                padding: '12px',
                background: theme === 'dark' ? 'rgba(224, 72, 72, 0.1)' : 'rgba(212, 24, 61, 0.1)',
                borderRadius: 8,
                border: `1px solid ${colors.danger}`
            }}>
                {error}
            </div>}

            <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>Loading…</div>
                ) : configs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>No VPN configs</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: colors.bgPanel }}>
                                <th style={{ padding: 12, textAlign: 'left', color: colors.text, width: '16.66%' }}>No.</th>
                                <th style={{ padding: 12, textAlign: 'left', color: colors.text, width: '16.66%' }}>Name</th>
                                <th style={{ padding: 12, textAlign: 'left', color: colors.text, width: '16.66%' }}>Protocol</th>
                                <th style={{ padding: 12, textAlign: 'left', color: colors.text, width: '16.66%' }}>File</th>
                                <th style={{ padding: 12, textAlign: 'left', color: colors.text, width: '16.66%' }}>Actions</th>
                                <th style={{ padding: 12, textAlign: 'center', color: colors.text, width: '16.66%' }}>Connection</th>
                            </tr>
                        </thead>
                        <tbody>
                            {configs.map((c, index) => (
                                <tr key={c.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                                    <td style={{ padding: 12, width: '16.66%', color: colors.text }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: 12, color: colors.text, width: '16.66%' }}>{c.name}</td>
                                    <td style={{ padding: 12, color: colors.text, width: '16.66%' }}>{c.protocol}</td>
                                    <td style={{ padding: 12, color: colors.text, width: '16.66%' }}>{c.configFileName}</td>
                                    <td style={{ padding: 12, width: '16.66%' }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <MdDownload 
                                                onClick={() => downloadConfig(c.id, c.configFileName)} 
                                                onMouseEnter={() => setActionButtonHover(`download-${c.id}`)}
                                                onMouseLeave={() => setActionButtonHover(null)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: actionButtonHover === `download-${c.id}` ? colors.accent : colors.textMuted,
                                                    fontSize: 20,
                                                    transition: 'all 0.15s ease',
                                                    transform: actionButtonHover === `download-${c.id}` ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                                title="Download"
                                            />
                                            <HiDocumentDuplicate 
                                                onClick={() => cloneConfig(c.id)}
                                                onMouseEnter={() => setActionButtonHover(`clone-${c.id}`)}
                                                onMouseLeave={() => setActionButtonHover(null)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: actionButtonHover === `clone-${c.id}` ? colors.accent : colors.textMuted,
                                                    fontSize: 20,
                                                    transition: 'all 0.15s ease',
                                                    transform: actionButtonHover === `clone-${c.id}` ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                                title="Clone"
                                            />
                                            <MdModeEdit 
                                                onClick={() => openEdit(c)}
                                                onMouseEnter={() => setActionButtonHover(`edit-${c.id}`)}
                                                onMouseLeave={() => setActionButtonHover(null)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: actionButtonHover === `edit-${c.id}` ? colors.accent : colors.textMuted,
                                                    fontSize: 20,
                                                    transition: 'all 0.15s ease',
                                                    transform: actionButtonHover === `edit-${c.id}` ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                                title="Edit"
                                            />
                                            <RiDeleteBin6Line 
                                                onClick={() => removeConfig(c.id)}
                                                onMouseEnter={() => setActionButtonHover(`delete-${c.id}`)}
                                                onMouseLeave={() => setActionButtonHover(null)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: colors.danger,
                                                    fontSize: 20,
                                                    transition: 'all 0.15s ease',
                                                    transform: actionButtonHover === `delete-${c.id}` ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                                title="Delete"
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: 12, textAlign: 'center', width: '16.66%' }}>
                                        {/* Connect/Disconnect Button */}
                                        <button
                                            onClick={() => toggleConfig(c.id)}
                                            disabled={connectingId === c.id}
                                            onMouseEnter={() => setActionButtonHover(`connect-${c.id}`)}
                                            onMouseLeave={() => setActionButtonHover(null)}
                                            title={connectingId === c.id ? 'Connecting...' : c.isActive ? 'Disconnect' : 'Connect'}
                                            style={{
                                                padding: '6px 14px',
                                                backgroundColor: connectingId === c.id
                                                    ? (theme === 'dark' ? '#2a2a2a' : '#e5e7eb')
                                                    : c.isActive ? colors.danger : colors.accent,
                                                color: connectingId === c.id
                                                    ? colors.textMuted
                                                    : '#0a0a0a',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: connectingId === c.id ? 'not-allowed' : 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                transition: 'all 0.15s ease',
                                                transform: (!connectingId && actionButtonHover === `connect-${c.id}`) ? 'scale(1.05)' : 'scale(1)',
                                                opacity: connectingId === c.id ? 0.7 : actionButtonHover === `connect-${c.id}` ? 0.9 : 1,
                                                whiteSpace: 'nowrap',
                                                minWidth: 90
                                            }}
                                        >
                                            {connectingId === c.id ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: 10, height: 10,
                                                        border: `2px solid ${colors.textMuted}`,
                                                        borderTopColor: colors.accent,
                                                        borderRadius: '50%',
                                                        animation: 'vpn-spin 0.7s linear infinite'
                                                    }} />
                                                    Connecting…
                                                </span>
                                            ) : c.isActive ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-backdrop" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal" style={{
                        background: colors.bgCard,
                        padding: 24,
                        borderRadius: 12,
                        width: '90%',
                        maxWidth: 500,
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ color: colors.text, marginBottom: 20 }}>
                            {editingId ? 'Edit VPN' : 'Add VPN'}
                        </h2>
                        <form onSubmit={saveConfig}>
                            <input 
                                name="name" 
                                value={form.name} 
                                onChange={handleChange} 
                                placeholder="Name" 
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    marginBottom: 12,
                                    background: colors.bgPanel,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    color: colors.text,
                                    boxSizing: 'border-box'
                                }}
                            />
                            <select 
                                name="protocol" 
                                value={form.protocol} 
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    marginBottom: 12,
                                    background: colors.bgPanel,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    color: colors.text
                                }}
                            >
                                <option>OpenVPN</option>
                                <option>WireGuard</option>
                            </select>
                            <input 
                                type="file" 
                                onChange={handleFile}
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    marginBottom: 12,
                                    background: colors.bgPanel,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    color: colors.text
                                }}
                            />
                            {form.configFileName && (
                                <div style={{ 
                                    color: colors.textMuted, 
                                    fontSize: 14, 
                                    marginBottom: 12 
                                }}>
                                    Selected: {form.configFileName}
                                </div>
                            )}
                            {fileError && <div style={{ color: colors.danger, marginBottom: 12 }}>{fileError}</div>}
                            <textarea 
                                name="description" 
                                value={form.description} 
                                onChange={handleChange}
                                placeholder="Description (optional)"
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    marginBottom: 12,
                                    background: colors.bgPanel,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    color: colors.text,
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    style={{
                                        flex: 1,
                                        padding: 10,
                                        background: colors.bgPanel,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        color: colors.text,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: 10,
                                        background: colors.accent,
                                        border: 'none',
                                        borderRadius: 8,
                                        color: theme === 'dark' ? '#121212' : '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <InstallClientModal 
                isOpen={showInstallModal} 
                onClose={() => setShowInstallModal(false)}
                theme={theme}
                palette={colors}
            />

            {/* Toast Notifications */}
            <div style={{
                position: 'fixed', bottom: 28, right: 28,
                display: 'flex', flexDirection: 'column-reverse', gap: 10,
                zIndex: 9999, pointerEvents: 'none'
            }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        minWidth: 260, maxWidth: 420,
                        padding: '14px 18px',
                        borderRadius: 12,
                        fontWeight: 500, fontSize: 14,
                        color: '#fff',
                        backgroundColor:
                            t.type === 'error' ? colors.danger
                            : t.type === 'success' ? colors.accent
                            : '#3b82f6',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        animation: 'toast-in 0.3s ease',
                        pointerEvents: 'auto'
                    }}>
                        {t.message}
                    </div>
                ))}
                <style>{`
                    @keyframes toast-in {
                        from { opacity: 0; transform: translateY(16px) scale(0.96); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes vpn-spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default VpnManagement;
