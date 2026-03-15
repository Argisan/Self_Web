const fs = require('fs');

// Path to the admin-config.json file
const adminConfigPath = './admin-config.json';

// Function to reset admin configuration
function resetAdminConfig() {
    // Deleting the admin-config.json file
    fs.unlink(adminConfigPath, (err) => {
        if (err) {
            console.error(`Error deleting file: ${err}`);
            return;
        }
        console.log('admin-config.json deleted successfully.');
    });

    // Resetting the password (you can insert your password reset logic here)
    // For example:
    const newPassword = 'new-default-password';
    console.log(`Admin password reset to: ${newPassword}`);
}

// Run the reset function
resetAdminConfig();