// server/sockets/desktopHandler.js
// Handles Socket.IO connections from the Neosec desktop client.
// Flow: connect → authenticate (send JWT) → auth_success / auth_error

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const VpnConfig = require('../models/VpnConfig');
const FirewallRule = require('../models/FirewallRule');

/**
 * Attaches desktop-client socket handlers to the given Socket.IO server.
 * Uses the /desktop namespace so desktop sockets are cleanly separated.
 *
 * @param {import('socket.io').Server} io
 */
function registerDesktopHandlers(io) {
    const desktopNs = io.of('/desktop');

    desktopNs.on('connection', (socket) => {
        console.log(`[socket] Desktop client connected: ${socket.id}`);

        // ── authenticate ──────────────────────────────────────────────────────
        // Expected payload: { token: "<JWT>" }
        socket.on('authenticate', async (payload) => {
            try {
                const token = payload && payload.token;

                if (!token) {
                    socket.emit('auth_error', { message: 'No token provided' });
                    return;
                }

                // 1. Verify JWT
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET);
                } catch (jwtErr) {
                    socket.emit('auth_error', { message: 'Invalid or expired token' });
                    return;
                }

                const userId = decoded.userId ?? decoded.id;

                // 2. Fetch user record
                const user = await User.findByPk(userId, {
                    attributes: ['id', 'email', 'role', 'accountType', 'subscriptionTier', 'isPaid'],
                });

                if (!user) {
                    socket.emit('auth_error', { message: 'User not found' });
                    return;
                }

                console.log(`[socket] Authenticated user: ${user.email} (${socket.id})`);

                // 3. Fetch active profile (if any)
                const activeProfile = await Profile.findOne({
                    where: { userId, isActive: true },
                }).catch(() => null);

                // 4. Fetch all VPN configs for this user
                const vpnConfigs = await VpnConfig.findAll({
                    where: { userId },
                    attributes: ['id', 'name', 'protocol', 'configFileName', 'description', 'isActive'],
                }).catch(() => []);

                // 5. Fetch firewall rules for this user
                const firewallRules = await FirewallRule.findAll({
                    where: { userId },
                    attributes: ['id', 'ip_address', 'port_start', 'port_end', 'protocol', 'action'],
                }).catch(() => []);

                // 6. Build and emit the profile payload
                const profilePayload = {
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        accountType: user.accountType,
                        subscriptionTier: user.subscriptionTier,
                        isPaid: user.isPaid,
                    },
                    profile: activeProfile
                        ? {
                              id: activeProfile.id,
                              name: activeProfile.name,
                              profileType: activeProfile.profileType,
                              // VPN
                              vpnEnabled: activeProfile.vpnEnabled,
                              vpnServer: activeProfile.vpnServer,
                              vpnProtocol: activeProfile.vpnProtocol,
                              vpnPort: activeProfile.vpnPort,
                              // Firewall
                              firewallEnabled: activeProfile.firewallEnabled,
                              firewallRules: activeProfile.firewallRules,
                              defaultFirewallAction: activeProfile.defaultFirewallAction,
                              // Status
                              isActive: activeProfile.isActive,
                              lastActivatedAt: activeProfile.lastActivatedAt,
                          }
                        : null,
                    vpnConfigs: vpnConfigs.map((v) => v.toJSON()),
                    firewallRules: firewallRules.map((r) => r.toJSON()),
                    connectedAt: new Date().toISOString(),
                };

                socket.emit('auth_success', profilePayload);

                // Store userId on socket for later use (e.g. profile updates)
                socket.userId = userId;
                socket.userEmail = user.email;

            } catch (err) {
                console.error('[socket] authenticate error:', err);
                socket.emit('auth_error', { message: 'Server error during authentication' });
            }
        });

        // ── vpn_toggle ────────────────────────────────────────────────────────
        // Allows the desktop to toggle VPN on/off in the active profile.
        // Payload: { token, enabled: bool }
        socket.on('vpn_toggle', async (payload) => {
            try {
                if (!socket.userId) {
                    socket.emit('vpn_toggle_error', { message: 'Not authenticated' });
                    return;
                }
                const { enabled } = payload;
                const updated = await Profile.update(
                    { vpnEnabled: !!enabled },
                    { where: { userId: socket.userId, isActive: true } }
                );
                console.log(`[socket] VPN toggled to ${enabled} for ${socket.userEmail}`);
                socket.emit('vpn_toggle_ack', { vpnEnabled: !!enabled, updated: updated[0] > 0 });
            } catch (err) {
                console.error('[socket] vpn_toggle error:', err);
                socket.emit('vpn_toggle_error', { message: 'Failed to toggle VPN' });
            }
        });

        // ── firewall_toggle ───────────────────────────────────────────────────
        // Allows the desktop to toggle the firewall on/off in the active profile.
        // Payload: { token, enabled: bool }
        socket.on('firewall_toggle', async (payload) => {
            try {
                if (!socket.userId) {
                    socket.emit('firewall_toggle_error', { message: 'Not authenticated' });
                    return;
                }
                const { enabled } = payload;
                await Profile.update(
                    { firewallEnabled: !!enabled },
                    { where: { userId: socket.userId, isActive: true } }
                );
                console.log(`[socket] Firewall toggled to ${enabled} for ${socket.userEmail}`);
                socket.emit('firewall_toggle_ack', { firewallEnabled: !!enabled });
            } catch (err) {
                console.error('[socket] firewall_toggle error:', err);
                socket.emit('firewall_toggle_error', { message: 'Failed to toggle firewall' });
            }
        });

        // ── disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            const who = socket.userEmail ?? socket.id;
            console.log(`[socket] Desktop client disconnected: ${who} (reason: ${reason})`);
        });
    });
}

module.exports = { registerDesktopHandlers };
