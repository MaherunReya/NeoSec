import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const ProfileManager = () => {
  const [profiles, setProfiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState("PENDING");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    profileType: "Home Mode",
    vpnEnabled: false,
    vpnServer: "",
    vpnProtocol: "OpenVPN",
    vpnPort: "",
    vpnUsername: "",
    firewallEnabled: true,
    defaultFirewallAction: "DENY",
    firewallRules: "",
    allowedIps: "",
    blockedIps: "",
    allowedPorts: "",
    blockedPorts: "",
    isScheduled: false,
    scheduleType: "NONE",
    scheduleStartTime: "",
    scheduleEndTime: "",
    scheduleDays: [],
    scheduleCondition: "",
    autoActivate: false
  });

  useEffect(() => {
    fetchProfiles();
    fetchLogs();
  }, []);

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfiles(response.data.profiles);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/profiles/logs/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleDayToggle = (day) => {
    const days = formData.scheduleDays || [];
    if (days.includes(day)) {
      setFormData({
        ...formData,
        scheduleDays: days.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        scheduleDays: [...days, day],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const submitData = {
        ...formData,
        vpnPort: formData.vpnPort && !isNaN(formData.vpnPort) ? parseInt(formData.vpnPort) : null,
        firewallRules: formData.firewallRules ? formData.firewallRules.split(",").map((r) => r.trim()).filter((r) => r !== "") : [],
        allowedIps: formData.allowedIps ? formData.allowedIps.split(",").map((ip) => ip.trim()).filter((ip) => ip !== "") : [],
        blockedIps: formData.blockedIps ? formData.blockedIps.split(",").map((ip) => ip.trim()).filter((ip) => ip !== "") : [],
        allowedPorts: formData.allowedPorts ? formData.allowedPorts.split(",").map((p) => p.trim()).filter((p) => p !== "" && !isNaN(p)).map(Number) : [],
        blockedPorts: formData.blockedPorts ? formData.blockedPorts.split(",").map((p) => p.trim()).filter((p) => p !== "" && !isNaN(p)).map(Number) : [],
      };

      if (editingProfile) {
        await axios.put(`${API_URL}/profiles/${editingProfile.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Profile updated successfully!");
      } else {
        await axios.post(`${API_URL}/profiles`, submitData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Profile created successfully!");
      }

      setShowForm(false);
      setEditingProfile(null);
      resetForm();
      fetchProfiles();
      fetchLogs();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile: " + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setApprovalStatus(profile.approvalStatus || "PENDING");

    setFormData({
      name: profile.name,
      description: profile.description || "",
      profileType: profile.profileType,
      vpnEnabled: profile.vpnEnabled,
      vpnServer: profile.vpnServer || "",
      vpnProtocol: profile.vpnProtocol || "OpenVPN",
      vpnPort: profile.vpnPort || "",
      vpnUsername: profile.vpnUsername || "",
      firewallEnabled: profile.firewallEnabled,
      defaultFirewallAction: profile.defaultFirewallAction || "DENY",
      firewallRules: Array.isArray(profile.firewallRules) ? profile.firewallRules.join(", ") : "",
      allowedIps: Array.isArray(profile.allowedIps) ? profile.allowedIps.join(", ") : "",
      blockedIps: Array.isArray(profile.blockedIps) ? profile.blockedIps.join(", ") : "",
      allowedPorts: Array.isArray(profile.allowedPorts) ? profile.allowedPorts.join(", ") : "",
      blockedPorts: Array.isArray(profile.blockedPorts) ? profile.blockedPorts.join(", ") : "",
      isScheduled: profile.isScheduled,
      scheduleType: profile.scheduleType || "NONE",
      scheduleStartTime: profile.scheduleStartTime || "",
      scheduleEndTime: profile.scheduleEndTime || "",
      scheduleDays: profile.scheduleDays || [],
      scheduleCondition: profile.scheduleCondition || "",
      autoActivate: profile.autoActivate
    });

    setShowForm(true);
  };

  const handleDeactivate = async (id) => {
    if (window.confirm("Are you sure you want to deactivate this profile?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(`${API_URL}/profiles/${id}/deactivate`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Profile deactivated successfully!");
        fetchProfiles();
        fetchLogs();
      } catch (error) {
        console.error("Error deactivating profile:", error);
        alert("Error deactivating profile");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this profile?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/profiles/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Profile deleted successfully!");
        fetchProfiles();
        fetchLogs();
      } catch (error) {
        console.error("Error deleting profile:", error);
        alert("Error deleting profile");
      }
    }
  };

  const handleActivate = async (profile) => {
    if (profile.profileType === "Enterprise Mode" && profile.approvalStatus !== "APPROVED") {
      alert("This Enterprise Mode profile is not approved yet. Please wait for admin approval.");
      return;
    }

    let password = null;
    if (profile.profileType === "Enterprise Mode") {
      password = prompt("Enter the Enterprise Mode password to activate:");
      if (!password) {
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/profiles/${profile.id}/activate`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Profile activated successfully!");
      fetchProfiles();
      fetchLogs();
    } catch (error) {
      console.error("Error activating profile:", error);
      const errorMsg = error.response?.data?.message || "Error activating profile";
      alert(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      profileType: "Home Mode",
      vpnEnabled: false,
      vpnServer: "",
      vpnProtocol: "OpenVPN",
      vpnPort: "",
      vpnUsername: "",
      firewallEnabled: true,
      defaultFirewallAction: "DENY",
      firewallRules: "",
      allowedIps: "",
      blockedIps: "",
      allowedPorts: "",
      blockedPorts: "",
      isScheduled: false,
      scheduleType: "NONE",
      scheduleStartTime: "",
      scheduleEndTime: "",
      scheduleDays: [],
      scheduleCondition: "",
      autoActivate: false,
    });
    setApprovalStatus("PENDING");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProfile(null);
    resetForm();
  };

  const formatDate = (date) => new Date(date).toLocaleString();

  const getActionBadgeClass = (action) => {
    switch (action) {
      case "CREATED": return "bg-zinc-800 border border-zinc-700";
      case "UPDATED": return "bg-blue-600";
      case "DELETED": return "bg-red-600";
      case "ACTIVATED": return "bg-green-600";
      case "DEACTIVATED": return "bg-orange-600";
      default: return "bg-zinc-600";
    }
  };

  if (loading) {
    return <div className="text-white p-5">Loading profiles...</div>;
  }

  return (
    <div className="text-white p-5 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Security Profile Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-4 py-2 rounded-lg font-semibold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            {showLogs ? "Hide Logs" : "View Activity Logs"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg font-semibold bg-green-500 text-black hover:bg-green-600 transition-colors"
          >
            Create New Profile
          </button>
        </div>
      </div>

      {/* Activity Logs Section */}
      {showLogs && (
        <div className="mt-6 mb-6 bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-xl mb-4 font-semibold">Activity Logs</h3>
          {!logs.length ? (
            <p className="text-zinc-400">No activity logs found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-green-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className={`px-3 py-1 rounded text-xs font-bold ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-zinc-200">
                      <span className="text-zinc-500">Profile:</span> {log.profile?.name || log.Profile?.name || (
                        <span className="text-red-400 italic">
                          {log.description?.match(/"([^"]+)"/)?.[1] || "Deleted"}
                        </span>
                      )}
                    </p>
                    <p className="text-zinc-400 text-sm">
                      <span className="text-zinc-500">User:</span> {log.userEmail}
                    </p>
                    {log.description && (
                      <p className="mt-1 text-zinc-300 text-sm">{log.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-7">
          <h3 className="mb-4 text-2xl font-bold">
            {editingProfile ? "Edit Profile" : "Create New Profile"}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Basic Information */}
            <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
              <h4 className="mb-4 text-green-500 text-lg font-semibold">Basic Information</h4>

              <div className="flex flex-col mb-4">
                <label className="text-zinc-400 mb-2">Profile Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex flex-col mb-4">
                <label className="text-zinc-400 mb-2">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex flex-col mb-4">
                <label className="text-zinc-400 mb-2">Profile Type</label>
                <select
                  name="profileType"
                  value={formData.profileType}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="Home Mode">Home Mode</option>
                  <option value="Enterprise Mode">Enterprise Mode</option>
                </select>
              </div>

              {/* Enterprise Mode Notice */}
              {formData.profileType === "Enterprise Mode" && (!editingProfile || editingProfile.approvalStatus !== "APPROVED") && (
                <div className="p-4 border border-yellow-500 rounded-lg bg-yellow-900/20 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-400 text-2xl">⚠️</div>
                    <div className="flex-1">
                      <p className="text-yellow-400 text-sm font-semibold mb-2">
                        Admin Approval Required
                      </p>
                      <p className="text-zinc-300 text-sm mb-3">
                        Enterprise Mode profiles require admin approval before they can be activated.
                        Once approved by an administrator, they will set a password that you'll need to activate this profile.
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">Current Status:</span>
                        <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                          approvalStatus === "APPROVED"
                            ? "bg-green-600 text-white"
                            : "bg-yellow-600 text-black"
                        }`}>
                          {approvalStatus}
                        </span>
                      </div>
                      {approvalStatus === "PENDING" && (
                        <p className="text-zinc-400 text-xs mt-2">
                          Your profile is awaiting admin approval. You'll be notified once it's approved.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* VPN Settings */}
            <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
              <h4 className="mb-4 text-green-500 text-lg font-semibold">VPN Settings</h4>

              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  name="vpnEnabled"
                  checked={formData.vpnEnabled}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span>Enable VPN</span>
              </label>

              {formData.vpnEnabled && (
                <div className="ml-6 border-l-2 border-green-500 pl-4 flex flex-col gap-3">
                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">VPN Server Address</label>
                    <input
                      type="text"
                      name="vpnServer"
                      placeholder="vpn.example.com"
                      value={formData.vpnServer}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Protocol</label>
                    <select
                      name="vpnProtocol"
                      value={formData.vpnProtocol}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="OpenVPN">OpenVPN</option>
                      <option value="WireGuard">WireGuard</option>
                      <option value="IKEv2">IKEv2</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Port</label>
                    <input
                      type="number"
                      name="vpnPort"
                      placeholder="1194"
                      value={formData.vpnPort}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Username</label>
                    <input
                      type="text"
                      name="vpnUsername"
                      placeholder="username"
                      value={formData.vpnUsername}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Firewall Settings */}
            <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
              <h4 className="mb-4 text-green-500 text-lg font-semibold">Firewall Settings</h4>

              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  name="firewallEnabled"
                  checked={formData.firewallEnabled}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span>Enable Firewall</span>
              </label>

              {formData.firewallEnabled && (
                <div className="ml-6 border-l-2 border-green-500 pl-4 flex flex-col gap-3">
                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Default Action</label>
                    <select
                      name="defaultFirewallAction"
                      value={formData.defaultFirewallAction}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="ALLOW">Allow All (Blacklist Mode)</option>
                      <option value="DENY">Deny All (Whitelist Mode)</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Custom Rules (comma-separated)</label>
                    <input
                      type="text"
                      name="firewallRules"
                      placeholder="rule1, rule2, rule3"
                      value={formData.firewallRules}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Access Control */}
            <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
              <h4 className="mb-4 text-green-500 text-lg font-semibold">Access Control</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-zinc-400 mb-2">Allowed IPs</label>
                  <input
                    type="text"
                    name="allowedIps"
                    placeholder="192.168.1.1, 10.0.0.1"
                    value={formData.allowedIps}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-zinc-400 mb-2">Blocked IPs</label>
                  <input
                    type="text"
                    name="blockedIps"
                    placeholder="192.168.1.100, 10.0.0.50"
                    value={formData.blockedIps}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-zinc-400 mb-2">Allowed Ports</label>
                  <input
                    type="text"
                    name="allowedPorts"
                    placeholder="80, 443, 8080"
                    value={formData.allowedPorts}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-zinc-400 mb-2">Blocked Ports</label>
                  <input
                    type="text"
                    name="blockedPorts"
                    placeholder="21, 23, 25"
                    value={formData.blockedPorts}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
              <h4 className="mb-4 text-green-500 text-lg font-semibold">Scheduling</h4>

              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  name="isScheduled"
                  checked={formData.isScheduled}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span>Enable Scheduling</span>
              </label>

              {formData.isScheduled && (
                <div className="ml-6 border-l-2 border-green-500 pl-4 flex flex-col gap-3">
                  <div className="flex flex-col">
                    <label className="text-zinc-400 mb-2">Schedule Type</label>
                    <select
                      name="scheduleType"
                      value={formData.scheduleType}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="NONE">None</option>
                      <option value="TIME">Time-Based</option>
                      <option value="CONDITION">Condition-Based</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>

                  {(formData.scheduleType === "TIME" || formData.scheduleType === "BOTH") && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-zinc-400 mb-2">Start Time</label>
                          <input
                            type="time"
                            name="scheduleStartTime"
                            value={formData.scheduleStartTime}
                            onChange={handleInputChange}
                            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-zinc-300 focus:outline-none focus:border-green-500"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-zinc-400 mb-2">End Time</label>
                          <input
                            type="time"
                            name="scheduleEndTime"
                            value={formData.scheduleEndTime}
                            onChange={handleInputChange}
                            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-zinc-300 focus:outline-none focus:border-green-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-zinc-400 mb-2">Active Days</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                            <label key={day} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.scheduleDays.includes(day)}
                                onChange={() => handleDayToggle(day)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {(formData.scheduleType === "CONDITION" || formData.scheduleType === "BOTH") && (
                    <div className="flex flex-col">
                      <label className="text-zinc-400 mb-2">Activation Condition</label>
                      <input
                        type="text"
                        name="scheduleCondition"
                        placeholder="e.g., WiFi network name, IP range"
                        value={formData.scheduleCondition}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white focus:outline-none focus:border-green-500"
                      />
                      <small className="text-zinc-500 text-xs mt-1">
                        Example: "Company WiFi", "192.168.1.x", "Outside office hours"
                      </small>
                    </div>
                  )}

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="autoActivate"
                      checked={formData.autoActivate}
                      onChange={handleInputChange}
                      className="w-4 h-4"
                    />
                    <span>Auto-activate when conditions are met</span>
                  </label>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-600 transition-colors"
              >
                {editingProfile ? "Update Profile" : "Create Profile"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-zinc-700 text-white font-bold rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile List */}
      <div className="mt-7">
        <h3 className="text-xl mb-4 font-semibold">Your Profiles ({profiles.length})</h3>

        {!profiles.length ? (
          <p className="text-zinc-400">No profiles yet. Create your first security profile!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`bg-zinc-900 border rounded-xl p-5 ${profile.isActive ? "border-green-500" : "border-zinc-800"}`}
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold">{profile.name}</h4>
                      
                      <span className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 font-semibold">
                        {profile.profileType}
                      </span>

                      {profile.profileType === "Enterprise Mode" && (
                        <span
                          className={`px-2 py-1 text-xs rounded font-bold ${
                            profile.approvalStatus === "APPROVED"
                              ? "bg-green-600 text-black"
                              : "bg-yellow-600 text-black"
                          }`}
                        >
                          {profile.approvalStatus}
                        </span>
                      )}

                      {profile.isActive && (
                        <span className="px-2 py-1 text-xs rounded bg-green-500 text-black font-bold">
                          ● ACTIVE
                        </span>
                      )}
                    </div>

                    {profile.description && (
                      <p className="text-zinc-400 text-sm mb-3">{profile.description}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-3 border-t border-zinc-800">
                      <div>
                        <strong className="text-zinc-500 block mb-1">VPN:</strong>
                        {profile.vpnEnabled ? (
                          <span className="text-green-500">✓ Enabled ({profile.vpnProtocol})</span>
                        ) : (
                          <span className="text-red-500">✗ Disabled</span>
                        )}
                      </div>

                      <div>
                        <strong className="text-zinc-500 block mb-1">Firewall:</strong>
                        {profile.firewallEnabled ? (
                          <span className="text-green-500">✓ Enabled ({profile.defaultFirewallAction})</span>
                        ) : (
                          <span className="text-red-500">✗ Disabled</span>
                        )}
                      </div>

                      <div>
                        <strong className="text-zinc-500 block mb-1">Scheduling:</strong>
                        {profile.isScheduled ? (
                          <span className="text-green-500">✓ {profile.scheduleType}</span>
                        ) : (
                          <span className="text-red-500">✗ None</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-zinc-500">
                      <p>Created: {formatDate(profile.createdAt)}</p>
                      {profile.lastActivatedAt && (
                        <p>
                          Last Activated: {formatDate(profile.lastActivatedAt)}
                          {profile.activationCount && ` (${profile.activationCount} times)`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    {!profile.isActive ? (
                      <button
                        onClick={() => handleActivate(profile)}
                        className="w-full px-3 py-2 bg-green-500 text-black text-sm rounded font-semibold hover:bg-green-600 transition-colors"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivate(profile.id)}
                        className="w-full px-3 py-2 bg-orange-600 text-black text-sm rounded font-semibold hover:bg-orange-700 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(profile)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded font-semibold hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileManager;