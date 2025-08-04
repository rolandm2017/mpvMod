const singleLetters = ["k", "h", "a", "c", "n", "y"];

const punctuation: string[] = [";", "'", "\\", "-", "="];

const fKeys = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];

// TODO: Test number keys 1-9 and 0 above home row

export const recommendedHotkeys = [...singleLetters, ...punctuation, ...fKeys];
