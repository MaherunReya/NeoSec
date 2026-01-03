// server/config/db.js
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProd = process.env.NODE_ENV === 'production';

// Validate DATABASE_URL before creating Sequelize instance
if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in environment variables!');
    console.error('Please check your .env file in the server directory.');
    throw new Error('DATABASE_URL environment variable is required');
}

// ---- Sequelize instance ----
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    // from both files: log in dev, disable in prod
    logging: isProd ? false : console.log,
    // Use camelCase for column names to match database schema
    define: {
        underscored: false,
    },
    dialectOptions: {
        ssl:
            process.env.DATABASE_URL?.includes('render.com') ||
            process.env.DATABASE_URL?.includes('dpg-') || // Render database pattern
            process.env.DATABASE_URL?.includes('amazonaws.com') ||
            process.env.DATABASE_URL?.includes('supabase.co') ||
            process.env.DATABASE_URL?.includes('vercel-storage.com') ||
            isProd
                ? { require: true, rejectUnauthorized: false }
                : false,
    },
});

// ---- helpers ----
async function tableExists(tableName) {
    const [results] = await sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
    );
  `);
    return results?.[0]?.exists === true;
}

async function getMissingTables(tables) {
    const missing = [];
    for (const table of tables) {
        const exists = await tableExists(table);
        if (!exists) missing.push(table);
    }
    return missing;
}

// Helper to rename a column only if the old name exists and the new name is missing
async function renameColumnIfExists(table, oldName, newName) {
    const [cols] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = '${table}' AND table_schema = 'public';
    `);
    const names = cols.map(c => c.column_name);
    if (names.includes(oldName) && !names.includes(newName)) {
        console.log(`⚠️  Renaming column ${table}.${oldName} -> ${newName}`);
        await sequelize.query(`ALTER TABLE ${table} RENAME COLUMN "${oldName}" TO "${newName}";`);
        console.log(`✅ Renamed ${table}.${oldName} -> ${newName}`);
    }
}

// ---- connectDB ----
const connectDB = async () => {
    try {
        // 1) Test connection
        await sequelize.authenticate();
        console.log('Database connected successfully...');

        // 2) Ensure models are loaded/registered (from 2nd file)
        require('../models');

        // 3) Check if "users" table exists (from both files)
        const usersTableExists = await tableExists('users');

        if (!usersTableExists) {
            // First-time setup: create all tables
            console.log('No tables found (users missing). Creating all database tables...');
            await sequelize.sync({ force: false });
            console.log('Database tables created successfully.');
            return;
        }

        console.log('Users table exists. Checking remaining tables...');

        // 4) Full set check (from 2nd file)
        const tablesToCheck = [
            'users',
            'vpn_configs',
            'notifications',
            'threats',
            'firewall_rules',
            'data_transfers',
            'groups',
            'invitations',
            'group_members',
            'subscriptions',
            'profiles',
            'profile_logs',
            'audit_logs',
            'devices',
            'login_history',
            'feature_toggles',
            'role_templates',
            'mfa_settings',
            'impersonation_sessions',
            'blocklist_ips',
            'activity_logs',
            'threat_blocker_settings'
        ];

        const missingTables = await getMissingTables(tablesToCheck);

        // If anything missing, create tables without dropping anything
        if (missingTables.length > 0) {
            console.log(
                `Missing tables detected (${missingTables.join(', ')}). Creating database tables...`
            );
            // Sync will create missing tables and update schema
            // Make sure all models are loaded before syncing
            require('../models/ImpersonationSession');
            require('../models/ActivityLog');
            require('../models/BlocklistIP');
            require('../models/ThreatBlockerSettings');
            await sequelize.sync({ force: false, alter: false });
            console.log('Database tables created successfully.');
            
            // Verify all tables now exist
            const stillMissing = await getMissingTables(tablesToCheck);
            if (stillMissing.length > 0) {
                console.warn(`Warning: Some tables still missing after sync: ${stillMissing.join(', ')}`);
                // Try sync with alter mode as fallback
                console.log('Attempting to create remaining tables with alter mode...');
                await sequelize.sync({ force: false, alter: true });
                const finalCheck = await getMissingTables(tablesToCheck);
                if (finalCheck.length > 0) {
                    console.error(`Error: Could not create tables: ${finalCheck.join(', ')}`);
                } else {
                    console.log('All tables created successfully.');
                }
            }
        } else {
            console.log('Database tables already exist.');
        }

        // 5a) Normalize legacy snake_case columns to camelCase
        try {
            await renameColumnIfExists('profile_logs', 'profile_id', 'profileId');
            await renameColumnIfExists('profile_logs', 'user_id', 'userId');
            await renameColumnIfExists('invitations', 'group_id', 'groupId');
            await renameColumnIfExists('invitations', 'inviter_id', 'inviterId');
            await renameColumnIfExists('invitations', 'invitee_id', 'inviteeId');
            await renameColumnIfExists('scan_histories', 'user_id', 'userId');
            await renameColumnIfExists('scan_histories', 'scan_type', 'scanType');
            await renameColumnIfExists('scan_histories', 'file_hash', 'fileHash');
            await renameColumnIfExists('scan_histories', 'scan_id', 'scanId');
            await renameColumnIfExists('scan_histories', 'scan_date', 'scanDate');
            await renameColumnIfExists('feature_toggles', 'feature_name', 'featureName');
            await renameColumnIfExists('feature_toggles', 'target_type', 'targetType');
            await renameColumnIfExists('feature_toggles', 'target_id', 'targetId');
            await renameColumnIfExists('feature_toggles', 'target_role', 'targetRole');
            await renameColumnIfExists('feature_toggles', 'created_by', 'createdBy');
            await renameColumnIfExists('role_templates', 'is_system', 'isSystem');
            await renameColumnIfExists('role_templates', 'created_by', 'createdBy');
            await renameColumnIfExists('mfa_settings', 'user_id', 'userId');
            await renameColumnIfExists('mfa_settings', 'last_used_at', 'lastUsedAt');
            await renameColumnIfExists('impersonation_sessions', 'admin_user_id', 'adminUserId');
            await renameColumnIfExists('impersonation_sessions', 'target_user_id', 'targetUserId');
            await renameColumnIfExists('impersonation_sessions', 'started_at', 'startedAt');
            await renameColumnIfExists('impersonation_sessions', 'ended_at', 'endedAt');
            await renameColumnIfExists('impersonation_sessions', 'ip_address', 'ipAddress');
            await renameColumnIfExists('impersonation_sessions', 'is_active', 'isActive');
            await renameColumnIfExists('vpn_configs', 'configfilename', 'configFileName');
            await renameColumnIfExists('vpn_configs', 'configfilecontent', 'configFileContent');
            await renameColumnIfExists('vpn_configs', 'isactive', 'isActive');
        } catch (renameError) {
            console.error('Error renaming legacy columns:', renameError.message);
        }

        // 5) Check and add missing columns to users table
        try {
            const [columns] = await sequelize.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public';
            `);
            const columnNames = columns.map(col => col.column_name);
            
            // Check for missing columns and add them
            // Note: Database may have camelCase columns (isApproved, accountType, etc.)
            // We check for both camelCase and snake_case versions
            const missingColumns = [];
            const hasIsApproved = columnNames.includes('isApproved') || columnNames.includes('is_approved');
            const hasName = columnNames.includes('name');
            const hasPhone = columnNames.includes('phone');
            const hasAccountType = columnNames.includes('accountType') || columnNames.includes('account_type');
            const hasSubscriptionTier = columnNames.includes('subscriptionTier') || columnNames.includes('subscription_tier');
            const hasIsPaid = columnNames.includes('isPaid') || columnNames.includes('is_paid');
            const hasLastLogin = columnNames.includes('lastLogin') || columnNames.includes('last_login');
            
            // isApproved should already exist, but check anyway
            if (!hasIsApproved) {
                console.log('⚠️  isApproved column missing. Adding it...');
                await sequelize.query(`
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT false NOT NULL;
                `);
            }
            
            // name column check and add
            if (!hasName) {
                console.log('⚠️  name column missing. Adding it...');
                await sequelize.query(`
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS "name" VARCHAR(100);
                `);
            }
            
            // phone column check and add
            if (!hasPhone) {
                console.log('⚠️  phone column missing. Adding it...');
                await sequelize.query(`
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
                `);
            }
            
            if (!hasAccountType) missingColumns.push('accountType');
            if (!hasSubscriptionTier) missingColumns.push('subscriptionTier');
            if (!hasIsPaid) missingColumns.push('isPaid');
            if (!hasLastLogin) missingColumns.push('lastLogin');
            
            if (missingColumns.length > 0) {
                console.log(`Missing columns detected: ${missingColumns.join(', ')}. Adding them...`);
                
                // Create ENUM types if they don't exist
                await sequelize.query(`
                    DO $$ BEGIN
                        CREATE TYPE account_type_enum AS ENUM ('user', 'leader', 'admin');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                `);
                
                await sequelize.query(`
                    DO $$ BEGIN
                        CREATE TYPE subscription_tier_enum AS ENUM ('free', 'basic', 'pro', 'enterprise');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                `);
                
                // Add missing columns
                // Use snake_case to match Sequelize's underscored: true setting
                if (missingColumns.includes('accountType')) {
                    await sequelize.query(`
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS account_type account_type_enum DEFAULT 'user' NOT NULL;
                    `);
                }
                
                if (missingColumns.includes('subscriptionTier')) {
                    await sequelize.query(`
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier_enum DEFAULT 'free' NOT NULL;
                    `);
                }
                
                if (missingColumns.includes('isPaid')) {
                    await sequelize.query(`
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
                    `);
                }
                
                if (missingColumns.includes('lastLogin')) {
                    await sequelize.query(`
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE;
                    `);
                }
                
                // Migrate data from camelCase to snake_case if camelCase columns exist
                const hasCamelCase = columnNames.includes('accountType') || columnNames.includes('subscriptionTier') || columnNames.includes('isPaid');
                if (hasCamelCase) {
                    console.log('⚠️  Migrating camelCase columns to snake_case...');
                    try {
                        // Migrate accountType
                        if (columnNames.includes('accountType') && columnNames.includes('account_type')) {
                            await sequelize.query(`
                                UPDATE users 
                                SET account_type = "accountType"
                                WHERE account_type IS NULL AND "accountType" IS NOT NULL;
                            `);
                        }
                        // Migrate subscriptionTier
                        if (columnNames.includes('subscriptionTier') && columnNames.includes('subscription_tier')) {
                            await sequelize.query(`
                                UPDATE users 
                                SET subscription_tier = "subscriptionTier"
                                WHERE subscription_tier IS NULL AND "subscriptionTier" IS NOT NULL;
                            `);
                        }
                        // Migrate isPaid
                        if (columnNames.includes('isPaid') && columnNames.includes('is_paid')) {
                            await sequelize.query(`
                                UPDATE users 
                                SET is_paid = "isPaid"
                                WHERE is_paid IS NULL AND "isPaid" IS NOT NULL;
                            `);
                        }
                        console.log('✅ Migration completed');
                    } catch (migError) {
                        console.warn('⚠️  Migration warning (non-critical):', migError.message);
                    }
                }
                
                // Update existing users with default values for snake_case columns
                await sequelize.query(`
                    UPDATE users 
                    SET 
                        account_type = COALESCE(account_type, 'user'),
                        subscription_tier = COALESCE(subscription_tier, 'free'),
                        is_paid = COALESCE(is_paid, false)
                    WHERE account_type IS NULL OR subscription_tier IS NULL OR is_paid IS NULL;
                `);
                
                console.log('✅ Missing columns added successfully.');
            } else {
                console.log('✅ All required columns exist in users table.');
            }
        } catch (colError) {
            console.error('Error checking/adding columns:', colError.message);
            // Don't fail the entire connection if column check fails
        }

        // 5b) Ensure profiles table has geoLocationCountries column
        try {
            const [profileCols] = await sequelize.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profiles' AND table_schema = 'public';
            `);
            const profileColumnNames = profileCols.map(col => col.column_name);
            if (!profileColumnNames.includes('geoLocationCountries')) {
                console.log('⚠️  geoLocationCountries column missing in profiles. Adding it...');
                await sequelize.query(`
                    ALTER TABLE profiles 
                    ADD COLUMN IF NOT EXISTS "geoLocationCountries" JSONB DEFAULT '[]'::jsonb;
                `);
                console.log('✅ geoLocationCountries column added to profiles.');
            }
        } catch (profileColError) {
            console.error('Error checking/adding profiles columns:', profileColError.message);
        }

        // 6) Fix firewall_rules table columns if needed
        try {
            const { fixFirewallRulesColumns } = require('../scripts/fixFirewallRulesColumns');
            await fixFirewallRulesColumns();
        } catch (fixError) {
            console.error('Error fixing firewall_rules columns:', fixError.message);
            // Don't fail the entire connection if column fix fails
        }

        // 7) Schema sync behavior
        if (!isProd) {
            // Development: auto-update schema safely
            console.log('Syncing database schema (alter mode)...');
            await sequelize.sync();
            console.log('Database schema updated (new columns added if any).');
        } else {
            // Production: columns are now handled above
            console.log('Production mode: Schema check completed.');
        }
    } catch (err) {
        console.error('Database connection/sync error:', err.message);
        console.error('Full error:', err);
        console.error('Error stack:', err.stack);
        // Don't exit in production - let the server start and log errors
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

module.exports = { sequelize, connectDB };
