import Store from 'electron-store';

// You need to use the same projectName that your Electron app uses
// Check your package.json for the "name" field, or check your Electron main process
const store = new Store({
    projectName: 'your-app-name', // Replace with your actual app name
});

console.log('Current hotkeys:', store.get('hotkeys', {}));
store.delete('hotkeys');
console.log('Hotkeys cleared');
