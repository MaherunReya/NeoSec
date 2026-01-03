// server/scripts/add-lastLogin-column.js
// Quick script to add lastLogin column to users table

const { sequelize } = require('../config/db');

async function addLastLoginColumn() {
    try {
        console.log('🔄 Adding lastLogin column to users table...');

        // Check if column already exists
        const [columns] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('lastLogin', 'last_login');
        `);

        const columnNames = columns.map(col => col.column_name);
        
        if (columnNames.includes('lastLogin') || columnNames.includes('last_login')) {
            console.log('✅ lastLogin column already exists.');
            process.exit(0);
        }

        // Add the column
        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP WITH TIME ZONE;
        `);

        console.log('✅ Successfully added lastLogin column to users table');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to add lastLogin column:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

// Run the script
addLastLoginColumn();



