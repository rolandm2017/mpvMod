// store-inspector.js
// Script to inspect all data in your Electron app's store

import Store from "electron-store";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the store (same as in your main app)
const projectName = "customMpv";
const store = new Store({
    projectName: projectName // You can change this to match your app name
    // This will use the same store location as your Electron app
});

console.log("=".repeat(60));
console.log("📦 ELECTRON STORE INSPECTOR");
console.log("=".repeat(60));

// Show store file location
console.log(`\n📍 Store file location:`);
console.log(`   ${store.path}`);

// Get store size
console.log(`\n📊 Store size:`);
console.log(`   ${store.size} items`);

// Show all store contents
console.log(`\n📋 All stored data:`);
console.log("-".repeat(40));

if (store.size === 0) {
    console.log("   (Store is empty)");
} else {
    // Get all data from the store
    const allData = store.store;

    for (const [key, value] of Object.entries(allData)) {
        console.log(`\n🔑 Key: "${key}"`);
        console.log(`   Type: ${typeof value}`);
        console.log(`   Value:`);

        // Pretty print the value based on its type
        if (typeof value === "object" && value !== null) {
            console.log(`   ${JSON.stringify(value, null, 4)}`);
        } else {
            console.log(`   ${value}`);
        }
    }
}

// Show individual keys that your app uses
console.log(`\n🔍 Checking specific keys your app uses:`);
console.log("-".repeat(40));

const specificKeys = ["hotkeys", "field-mappings", "mappings"];

specificKeys.forEach((key) => {
    const value = store.get(key);
    console.log(`\n📌 ${key}:`);
    if (value === undefined) {
        console.log(`   (not set)`);
    } else {
        console.log(`   ${JSON.stringify(value, null, 2)}`);
    }
});

// Additional store methods
console.log(`\n🛠️  Store methods available:`);
console.log("-".repeat(40));
console.log(`   store.clear()     - Clear all data`);
console.log(`   store.delete(key) - Delete specific key`);
console.log(`   store.has(key)    - Check if key exists`);
console.log(`   store.get(key)    - Get value for key`);
console.log(`   store.set(key, value) - Set value for key`);

console.log(`\n✅ Store inspection complete! And reminder, the store name was: ${projectName}`);
console.log("=".repeat(60));
