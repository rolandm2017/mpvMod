export function makeThingToBeSaved(e: KeyboardEvent) {
    // Build hotkey string
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Cmd');

    // Handle special keys
    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Escape') key = 'Esc';
    else if (key.length === 1) key = key.toUpperCase();

    // Don't capture modifier keys alone
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        return;
    }

    parts.push(key);
    return parts.join(' + ');
}
