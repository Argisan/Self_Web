const fs = require("fs/promises");
const path = require("path");

const adminConfigPath = path.join(__dirname, "data", "admin-config.json");

async function resetAdminConfig() {
  try {
    await fs.unlink(adminConfigPath);
    console.log("Removed data/admin-config.json.");
    console.log("Restart the server to generate a new admin password or use ADMIN_PASSWORD in .env.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No admin config file was found. Nothing to reset.");
      return;
    }

    console.error(`Could not reset admin config: ${error.message}`);
    process.exitCode = 1;
  }
}

resetAdminConfig();
