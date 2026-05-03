const { Op } = require('sequelize');
const VpnConfig = require('../models/VpnConfig');
const DataTransfer = require('../models/DataTransfer');
const ActivityLog = require('../models/ActivityLog');

let intervalHandle = null;
let checkIntervalMs = 30000;
let timeoutMs = 60000;

const parseMs = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveSchedulerConfig = () => {
    checkIntervalMs = parseMs(process.env.VPN_STATUS_CHECK_INTERVAL_MS, checkIntervalMs);
    timeoutMs = parseMs(process.env.VPN_STATUS_TIMEOUT_MS, timeoutMs);

    if (checkIntervalMs < 5000) {
        checkIntervalMs = 30000;
    }
    if (timeoutMs < 10000) {
        timeoutMs = 60000;
    }
};

const handleStaleConfig = async (vpnConfig) => {
    const previousStatus = vpnConfig.status;
    const wasActive = vpnConfig.isActive;

    await vpnConfig.update({
        status: 'OFFLINE',
        isActive: false
    });

    if (wasActive) {
        await DataTransfer.update(
            { isActive: false, sessionEnd: new Date() },
            { where: { userId: vpnConfig.userId, vpnConfigId: vpnConfig.id, isActive: true } }
        );
    }

    try {
        await ActivityLog.create({
            eventType: 'System Event',
            description: `VPN status timeout: set OFFLINE (${vpnConfig.name})`,
            status: 'Failed',
            severity: 'warning',
            userId: vpnConfig.userId,
            metadata: {
                vpnConfigId: vpnConfig.id,
                previousStatus
            }
        });
    } catch (logError) {
        console.error('[VPN Scheduler] Failed to log timeout:', logError.message);
    }
};

const checkForStaleVpnStatus = async () => {
    const cutoff = new Date(Date.now() - timeoutMs);

    const staleConfigs = await VpnConfig.findAll({
        where: {
            status: { [Op.in]: ['CONNECTING', 'DISCONNECTING'] },
            updatedAt: { [Op.lt]: cutoff }
        }
    });

    if (!staleConfigs.length) {
        return;
    }

    for (const vpnConfig of staleConfigs) {
        try {
            await handleStaleConfig(vpnConfig);
        } catch (error) {
            console.error('[VPN Scheduler] Failed to handle stale VPN config:', error.message);
        }
    }
};

const startVpnStatusScheduler = () => {
    if (process.env.VPN_STATUS_SCHEDULER_ENABLED === 'false') {
        console.log('[VPN Scheduler] Disabled via VPN_STATUS_SCHEDULER_ENABLED=false');
        return null;
    }

    if (intervalHandle) {
        return intervalHandle;
    }

    resolveSchedulerConfig();

    console.log(
        `[VPN Scheduler] Starting (check every ${checkIntervalMs}ms, timeout ${timeoutMs}ms)`
    );

    checkForStaleVpnStatus().catch((error) => {
        console.error('[VPN Scheduler] Initial check failed:', error.message);
    });

    intervalHandle = setInterval(() => {
        checkForStaleVpnStatus().catch((error) => {
            console.error('[VPN Scheduler] Periodic check failed:', error.message);
        });
    }, checkIntervalMs);

    return intervalHandle;
};

const stopVpnStatusScheduler = () => {
    if (!intervalHandle) {
        return;
    }

    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[VPN Scheduler] Stopped');
};

const getVpnStatusSchedulerStatus = () => ({
    isRunning: intervalHandle !== null,
    checkIntervalMs,
    timeoutMs
});

module.exports = {
    startVpnStatusScheduler,
    stopVpnStatusScheduler,
    getVpnStatusSchedulerStatus
};
