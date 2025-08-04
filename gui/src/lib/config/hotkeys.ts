// const singleLetters = ["k", "h", "a", "c", "n", "y"];

// const punctuation: string[] = [";", "'", "\\", "-", "="];

// const fKeys = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];

// Type definitions
type ModifierKey = "ctrl" | "shift" | "alt";
type KeyCategory = "letters" | "punctuation" | "numbers" | "functionKeys";
type HotkeyString = string;

interface KeysByCategory {
    letters: string[];
    punctuation: string[];
    numbers?: string[];
    functionKeys?: string[];
}

interface ModifierHotkeys {
    ctrl: Required<KeysByCategory>;
    shift: Omit<KeysByCategory, "numbers" | "functionKeys">;
    alt: Omit<KeysByCategory, "numbers" | "functionKeys">;
}

export interface HotkeyStructure {
    single: Omit<KeysByCategory, "numbers"> & { functionKeys: string[] };
    modifiers: ModifierHotkeys;
}

export const availableHotkeys: HotkeyStructure = {
    // Simple single key presses
    single: {
        letters: ["k", "h", "a", "c", "n", "y"],
        punctuation: [";", "'", "\\", "-", "="],
        functionKeys: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"]
    },

    // Modifier key combinations
    modifiers: {
        ctrl: {
            letters: ["a", "d", "f", "g", "x", "z", "q", "e", "r", "t", "u", "i", "o", "j", "k", "n", "m"],
            punctuation: [";", "'", ".", "/"],
            numbers: ["1", "2", "3", "4", "5"],
            functionKeys: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"]
        },

        shift: {
            letters: ["x", "c", "b", "d", "h", "y", "u", "H", "K", "B", "N", "M"],
            punctuation: ["$", "%", ":", '"']
        },

        alt: {
            letters: ["q", "w", "e", "r", "a", "d", "f", "g", "z", "x", "c", "b", "y", "h"],
            punctuation: ["]", "'", "/"]
        }
    }
};

// Alternative flat structure for easier lookup/validation
const flatHotkeyList: HotkeyString[] = [
    // Single keys
    ...availableHotkeys.single.letters,
    ...availableHotkeys.single.punctuation,
    ...availableHotkeys.single.functionKeys,

    // Ctrl combinations
    ...availableHotkeys.modifiers.ctrl.letters.map((key) => `Ctrl+${key}`),
    ...availableHotkeys.modifiers.ctrl.punctuation.map((key) => `Ctrl+${key}`),
    ...availableHotkeys.modifiers.ctrl.numbers.map((key) => `Ctrl+${key}`),
    ...availableHotkeys.modifiers.ctrl.functionKeys.map((key) => `Ctrl+${key}`),

    // Shift combinations
    ...availableHotkeys.modifiers.shift.letters.map((key) => `Shift+${key}`),
    ...availableHotkeys.modifiers.shift.punctuation.map((key) => `Shift+${key}`),

    // Alt combinations
    ...availableHotkeys.modifiers.alt.letters.map((key) => `Alt+${key}`),
    ...availableHotkeys.modifiers.alt.punctuation.map((key) => `Alt+${key}`)
];

// Helper functions for working with the hotkeys
const hotkeyUtils = {
    // Check if a hotkey is available
    isAvailable(hotkey: HotkeyString): boolean {
        return flatHotkeyList.includes(hotkey);
    },

    // Get all hotkeys for a specific modifier
    getByModifier(modifier: ModifierKey | "none"): HotkeyString[] {
        if (modifier === "none") {
            return [
                ...availableHotkeys.single.letters,
                ...availableHotkeys.single.punctuation,
                ...availableHotkeys.single.functionKeys
            ];
        }

        const modifierData = availableHotkeys.modifiers[modifier];
        if (!modifierData) return [];

        return Object.values(modifierData)
            .flat()
            .map((key) => `${modifier.charAt(0).toUpperCase() + modifier.slice(1)}+${key}`);
    },

    // Get all hotkeys by category (letters, punctuation, etc.)
    getByCategory(category: KeyCategory, modifier: ModifierKey | "none" = "none"): HotkeyString[] {
        if (modifier === "none") {
            return availableHotkeys.single[category as keyof typeof availableHotkeys.single] || [];
        }

        const modifierData = availableHotkeys.modifiers[modifier];
        const keys = modifierData?.[category as keyof typeof modifierData] as string[] | undefined;
        return keys?.map((key) => `${modifier.charAt(0).toUpperCase() + modifier.slice(1)}+${key}`) || [];
    },

    // Get total count
    getTotalCount(): number {
        return flatHotkeyList.length;
    }
} as const;

// Example usage:
// console.log("Total available hotkeys:", hotkeyUtils.getTotalCount());
// console.log("Ctrl combinations:", hotkeyUtils.getByModifier("ctrl"));
// console.log("Single letter keys:", hotkeyUtils.getByCategory("letters"));
// console.log("Is Ctrl+a available?", hotkeyUtils.isAvailable("Ctrl+a"));

/**
 * NOTE that you must modify the lengths of the separators in .repeat() by hand.
 *      -> "repeat(15)" is too long? Cut it down to .repeat(12)! Test and see
 */

// Enhanced formatting functions
function formatConsecutiveNumbers(numbers: string[]): string[] {
    if (numbers.length === 0) return [];

    // Check if it's a consecutive sequence starting from 1
    const sorted = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
    const isConsecutive = sorted.every((num, i) => parseInt(num) === i + 1);

    if (isConsecutive && sorted.length > 2) {
        return [`1–${sorted.length}`];
    }
    return numbers;
}

function formatFunctionKeys(fKeys: string[]): string[] {
    if (fKeys.length === 0) return [];

    // Check if it's F1 through F12
    const expectedFKeys = Array.from({ length: 12 }, (_, i) => `F${i + 1}`);
    const hasAllFKeys = expectedFKeys.every((key) => fKeys.includes(key));

    if (hasAllFKeys && fKeys.length === 12) {
        return ["F1–F12"];
    }
    return fKeys;
}

function formatCtrlHotkeys(ctrl: Required<KeysByCategory>): string {
    const formatRow = (label: string, keys: string[]) =>
        keys.length > 0 ? `Ctrl + [${label}]:${" ".repeat(Math.max(1, 13 - label.length))}${keys.join(", ")}` : "";

    return [
        formatRow("letters", ctrl.letters),
        formatRow("numbers", formatConsecutiveNumbers(ctrl.numbers)),
        formatRow("punctuation", ctrl.punctuation),
        formatRow("F-keys", formatFunctionKeys(ctrl.functionKeys))
    ]
        .filter(Boolean)
        .join("\n");
}

function formatShiftHotkeys(shift: Omit<KeysByCategory, "numbers" | "functionKeys">): string {
    // Combine letters and punctuation for shift since they're mixed
    const allKeys = [...shift.letters, ...shift.punctuation];
    return allKeys.length > 0 ? `Shift + [chars]:${" ".repeat(7)}${allKeys.join(", ")}` : "";
}

function formatAltHotkeys(alt: Omit<KeysByCategory, "numbers" | "functionKeys">): string {
    const formatRow = (label: string, keys: string[]) =>
        keys.length > 0 ? `Alt + [${label}]:${" ".repeat(Math.max(1, 14 - label.length))}${keys.join(", ")}` : "";

    return [formatRow("letters", alt.letters), formatRow("symbols", alt.punctuation)].filter(Boolean).join("\n");
}

/**
 * NOTE that you must modify the lengths of the separators in .repeat() by hand.
 *      -> "repeat(15)" is too long? Cut it down to .repeat(12)! Test and see
 */

// Main formatter function
function formatAvailableHotkeys(hotkeys: HotkeyStructure): string {
    const sections: string[] = [];

    // Single keys
    if (hotkeys.single.letters.length > 0) {
        sections.push(`Single letters:${" ".repeat(8)}${hotkeys.single.letters.join(", ")}`);
    }

    if (hotkeys.single.punctuation.length > 0) {
        sections.push(`Punctuation:${" ".repeat(11)}${hotkeys.single.punctuation.join(", ")}`);
    }

    if (hotkeys.single.functionKeys.length > 0) {
        const fKeyDisplay = formatFunctionKeys(hotkeys.single.functionKeys);
        sections.push(`F-keys:${" ".repeat(16)}${fKeyDisplay.join(", ")}`);
    }

    // Modifier combinations
    const ctrlSection = formatCtrlHotkeys(hotkeys.modifiers.ctrl);
    if (ctrlSection) sections.push(ctrlSection);

    const shiftSection = formatShiftHotkeys(hotkeys.modifiers.shift);
    if (shiftSection) sections.push(shiftSection);

    const altSection = formatAltHotkeys(hotkeys.modifiers.alt);
    if (altSection) sections.push(altSection);

    return sections.join("\n");
}

// Usage
const formattedHotkeys = formatAvailableHotkeys(availableHotkeys);
console.log(formattedHotkeys);

// For displaying in HTML with monospace font
function getHotkeyDisplayHTML(): string {
    return `<pre style="font-family: 'Courier New', Consolas, Monaco, monospace; line-height: 1.4; white-space: pre;">${formattedHotkeys}</pre>`;
}

// Export the formatted string
export { formattedHotkeys, formatAvailableHotkeys, getHotkeyDisplayHTML };
