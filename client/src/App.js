import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { authAPI, dashboardAPI, adminAPI } from './services/api';
import './index.css';
import ProfileManager from "./components/ProfileManager";

function App() {
    const [activeTab, setActiveTab] = useState('login');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Navigation state
    const [currentView, setCurrentView] = useState('dashboard'); // dashboard, vpn, firewall, profiles, users

    // Dashboard data
    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);

    // Admin data
    const [users, setUsers] = useState([]);
    const [adminStats, setAdminStats] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);


    useEffect(() => {
        const checkAuth = async () => {
            if (authAPI.isAuthenticated()) {
                try {
                    const currentUser = authAPI.getCurrentUser();
                    if (currentUser) setUser(currentUser);
                } catch (error) {
                    authAPI.logout();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user && currentView === 'dashboard') {
                try {
                    setDashboardLoading(true);
                    const response = await dashboardAPI.getDashboard();
                    if (response.success) setDashboardData(response.data);
                } catch (error) {
                    console.error("Dashboard fetch error:", error);
                } finally {
                    setDashboardLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [user, currentView]);

    useEffect(() => {
        const fetchAdminData = async () => {
            if (user?.role === 'admin' && currentView === 'users') {
                try {
                    setUsersLoading(true);
                    const [usersResponse, statsResponse] = await Promise.all([
                        adminAPI.getAllUsers(),
                        adminAPI.getStatistics()
                    ]);

                    if (usersResponse.success) setUsers(usersResponse.data);
                    if (statsResponse.success) setAdminStats(statsResponse.data);
                } catch (error) {
                    console.error("Admin fetch error:", error);
                } finally {
                    setUsersLoading(false);
                }
            }
        };

        fetchAdminData();
    }, [user, currentView]);


    const handleEditUser = (u) => {
        setEditingUser({ ...u });
        setShowEditModal(true);
    };

    const handleSaveUser = async () => {
        try {
            const response = await adminAPI.updateUser(editingUser.id, {
                email: editingUser.email,
                role: editingUser.role,
                isApproved: editingUser.isApproved
            });

            if (response.success) {
                setUsers(users.map(u => u.id === editingUser.id ? response.data : u));
                setShowEditModal(false);
                setEditingUser(null);
            }
        } catch (error) {
            alert("Update failed: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure?")) return;

        try {
            const response = await adminAPI.deleteUser(id);
            if (response.success) {
                setUsers(users.filter(u => u.id !== id));
            }
        } catch (error) {
            alert("Delete failed: " + (error.response?.data?.message || error.message));
        }
    };

    const handleLoginSuccess = (data) => setUser(data);

    const handleLogout = () => {
        authAPI.logout();
        setUser(null);
        setActiveTab('login');
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#121212',
                color: '#36E27B',
            }}>
                Loading...
            </div>
        );
    }

    if (user) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#121212',
                display: 'flex',
                color: '#fff'
            }}>
                {/* SIDEBAR */}
                <Sidebar user={user} currentView={currentView} setCurrentView={setCurrentView} handleLogout={handleLogout} />

                {/* MAIN CONTENT */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                    {currentView === 'dashboard' && (
                        <FullDashboardView
                            user={user}
                            dashboardData={dashboardData}
                            dashboardLoading={dashboardLoading}
                        />
                    )}

                    {currentView === 'vpn' && <VPNView />}
                    {currentView === 'firewall' && <FirewallView />}
                    {currentView === 'profiles' && <ProfilesView />}
                    {currentView === 'users' && user.role === 'admin' && (
                        <AdminView
                            users={users}
                            adminStats={adminStats}
                            usersLoading={usersLoading}
                            handleDeleteUser={handleDeleteUser}
                            handleEditUser={handleEditUser}
                            editingUser={editingUser}
                            showEditModal={showEditModal}
                            setShowEditModal={setShowEditModal}
                            setEditingUser={setEditingUser}
                            handleSaveUser={handleSaveUser}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>NeoSec</h1>
                    <p>Welcome! Please login or register to continue.</p>
                </div>

                <div className="auth-tabs">
                    <button className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
                            onClick={() => setActiveTab('login')}>
                        Login
                    </button>
                    <button className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => setActiveTab('register')}>
                        Register
                    </button>
                </div>

                <div className="auth-content">
                    {activeTab === 'login'
                        ? <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveTab('register')} />
                        : <Register onSwitchToLogin={() => setActiveTab('login')} />}
                </div>
            </div>
        </div>
    );
}

function Sidebar({ user, currentView, setCurrentView, handleLogout }) {
    return (
        <div style={{
            width: '250px',
            backgroundColor: '#181818',
            padding: '20px',
            borderRight: '1px solid #282828'
        }}>
            <h2 style={{ color: '#36E27B' }}>NeoSec</h2>
            <p style={{ color: '#888' }}>{user.email}</p>

            <nav style={{ marginTop: '30px' }}>
                {["dashboard", "vpn", "firewall", "profiles"].map(view => (
                    <button
                        key={view}
                        onClick={() => setCurrentView(view)}
                        style={navButtonStyle(currentView === view)}
                    >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                ))}

                {user.role === 'admin' && (
                    <button
                        onClick={() => setCurrentView('users')}
                        style={navButtonStyle(currentView === 'users')}
                    >
                        User Management
                    </button>
                )}
            </nav>

            <button
                onClick={handleLogout}
                style={{
                    width: '100%',
                    marginTop: '30px',
                    padding: '12px',
                    backgroundColor: '#282828',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: '8px'
                }}
            >
                Logout
            </button>
        </div>
    );
}

function FullDashboardView({ user, dashboardData, dashboardLoading }) {
    return (
        <div>
            <h1 style={{ fontSize: '32px' }}>Welcome to NeoSec</h1>
            <p style={{ color: '#888' }}>VPN & Firewall Manager Dashboard</p>

            {!user.isApproved && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#282828',
                    border: '1px solid #FF9800',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}>
                    <strong style={{ color: '#FF9800' }}>⚠ Pending Approval</strong>
                </div>
            )}

            {/* DASHBOARD CARDS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>

                {/* VPN STATUS */}
                <DashboardCard title="VPN Status">
                    {dashboardLoading ? "Loading..." : (
                        <>
                            <div style={{
                                fontSize: '24px',
                                color: dashboardData?.vpnStatus?.connected ? '#36E27B' : '#FF9800'
                            }}>
                                {dashboardData?.vpnStatus?.connected ? "Connected" : "Disconnected"}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888' }}>
                                {dashboardData?.vpnStatus?.server ? `Server: ${dashboardData.vpnStatus.server}` : "No active server"}
                            </div>
                        </>
                    )}
                </DashboardCard>

                {/* THREATS BLOCKED */}
                <DashboardCard title="Threats Blocked">
                    {dashboardLoading
                        ? "Loading..."
                        : (
                            <>
                                <div style={{ fontSize: '24px', color: '#36E27B' }}>
                                    {dashboardData?.threatsBlocked?.last24Hours ?? 0}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                    Total: {dashboardData?.threatsBlocked?.total ?? 0}
                                </div>
                            </>
                        )}
                </DashboardCard>

                {/* ACTIVE RULES */}
                <DashboardCard title="Active Firewall Rules">
                    <div style={{ fontSize: '24px', color: '#36E27B' }}>
                        {dashboardData?.activeRules ?? 0}
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}


function AdminView({
    users, adminStats, usersLoading,
    handleDeleteUser, handleEditUser,
    editingUser, setEditingUser,
    showEditModal, setShowEditModal,
    handleSaveUser
}) {

    return (
        <div>
            <h1>User Management</h1>

            {/* ADMIN STAT CARDS */}
            {adminStats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <DashboardCard title="Total Users">
                        {adminStats.users?.total ?? 0}
                    </DashboardCard>

                    <DashboardCard title="Pending Approvals">
                        {adminStats.users?.pendingApprovals ?? 0}
                    </DashboardCard>

                    <DashboardCard title="Total Threats Blocked">
                        {adminStats.threats?.totalBlocked ?? 0}
                    </DashboardCard>

                    <DashboardCard title="Application Health">
                        {adminStats.applicationHealth?.status ?? "Unknown"}
                    </DashboardCard>
                </div>
            )}

            {/* USERS TABLE */}
            <div style={{
                padding: '25px',
                backgroundColor: '#181818',
                borderRadius: '10px',
                border: '1px solid #282828',
                marginBottom: '40px'
            }}>
                <h2>All Users</h2>

                {usersLoading ? (
                    <p>Loading users...</p>
                ) : users.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #282828' }}>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #282828' }}>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{u.isApproved ? "Approved" : "Pending"}</td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button onClick={() => handleEditUser(u)} style={actionBtnStyle('#36E27B', '#121212')}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteUser(u.id)} style={actionBtnStyle('#FF4444', '#fff')}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* EDIT USER MODAL */}
            {showEditModal && editingUser && (
                <EditUserModal
                    editingUser={editingUser}
                    setEditingUser={setEditingUser}
                    setShowEditModal={setShowEditModal}
                    handleSaveUser={handleSaveUser}
                />
            )}
        </div>
    );
}

function DashboardCard({ title, children }) {
    return (
        <div style={{
            padding: '25px',
            backgroundColor: '#181818',
            borderRadius: '10px',
            border: '1px solid #282828'
        }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>{title}</div>
            {children}
        </div>
    );
}

function EditUserModal({ editingUser, setEditingUser, setShowEditModal, handleSaveUser }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#181818',
                padding: '30px',
                borderRadius: '10px',
                width: '400px',
                border: '1px solid #282828'
            }}>
                <h2>Edit User</h2>

                <label>Email</label>
                <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    style={inputStyle}
                />

                <label>Role</label>
                <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    style={inputStyle}
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>

                <label style={{ marginTop: '10px' }}>
                    <input
                        type="checkbox"
                        checked={editingUser.isApproved}
                        onChange={(e) => setEditingUser({ ...editingUser, isApproved: e.target.checked })}
                    /> Approved
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                        onClick={() => setShowEditModal(false)}
                        style={actionBtnStyle('#444', '#fff')}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSaveUser}
                        style={actionBtnStyle('#36E27B', '#121212')}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}


function VPNView() {
    return (
        <div>
            <h1>VPN Configurations</h1>
            <p>No VPN configurations yet.</p>
        </div>
    );
}

function FirewallView() {
    return (
        <div>
            <h1>Firewall Rules</h1>
            <p>No firewall rules yet.</p>
        </div>
    );
}

// Profile Managemet 
function ProfilesView() {
    return (
        <div>
            <h1>Security Profiles</h1>
            <ProfileManager />
        </div>
    );
}


function navButtonStyle(active) {
    return {
        width: '100%',
        padding: '12px 15px',
        marginBottom: '10px',
        backgroundColor: active ? '#1E402C' : 'transparent',
        color: active ? '#36E27B' : '#fff',
        borderRadius: '8px',
        border: active ? '1px solid #36E27B' : '1px solid transparent',
        cursor: 'pointer',
        textAlign: 'left'
    };
}

function actionBtnStyle(bg, color) {
    return {
        padding: '8px 12px',
        marginRight: '8px',
        backgroundColor: bg,
        color: color,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    };
}

const inputStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#121212',
    border: '1px solid #282828',
    borderRadius: '6px',
    color: '#fff',
    marginBottom: '12px'
};

export default App;
