// copy-config.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Electron store path
const defaultConfigPath = path.join(os.homedir(), "AppData", "Roaming", "Electron", "config.json");

// Correct project-specific path
const correctConfigPath = path.join(os.homedir(), "AppData", "Roaming", "customMpv-nodejs", "Config", "config.json");

async function copyConfig() {
    try {
        console.log("🔍 Checking paths...");
        console.log("Source (default):", defaultConfigPath);
        console.log("Target (correct):", correctConfigPath);

        // Check if default config exists
        try {
            await fs.access(defaultConfigPath);
            console.log("✅ Default config file found");
        } catch (error) {
            console.error("❌ Default config file not found at:", defaultConfigPath);
            return;
        }

        // Read the default config
        const configData = await fs.readFile(defaultConfigPath, "utf8");
        console.log("📖 Read config data:", configData.substring(0, 100) + "...");

        // Ensure target directory exists
        const targetDir = path.dirname(correctConfigPath);
        await fs.mkdir(targetDir, { recursive: true });
        console.log("📁 Ensured target directory exists:", targetDir);

        // Check if target file already exists
        let targetExists = false;
        try {
            await fs.access(correctConfigPath);
            targetExists = true;
            console.log("⚠️  Target config already exists");

            // Read existing target config
            const existingData = await fs.readFile(correctConfigPath, "utf8");
            console.log("📋 Existing target data:", existingData.substring(0, 100) + "...");

            // Create backup
            const backupPath = correctConfigPath + ".backup." + Date.now();
            await fs.writeFile(backupPath, existingData);
            console.log("💾 Created backup at:", backupPath);
        } catch (error) {
            console.log("✨ Target config doesn't exist, will create new");
        }

        // Copy the config
        await fs.writeFile(correctConfigPath, configData);
        console.log("✅ Successfully copied config to correct location");

        // Verify the copy
        const copiedData = await fs.readFile(correctConfigPath, "utf8");
        if (copiedData === configData) {
            console.log("✅ Verification successful - files match");
        } else {
            console.error("❌ Verification failed - files don't match");
        }

        console.log("\n🎉 Config copy operation completed!");
    } catch (error) {
        console.error("💥 Error during config copy:", error);
    }
}

// Run the copy operation
copyConfig();
