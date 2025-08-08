import type { HotkeyRegister, ParsedSegmentObj } from "$lib/interfaces";

/**
 * The code is used in the main page or it doesn't go in this file.
 * Hence "mainPageUtil.ts"
 */
export function executeActionIfHotkey(
    e: KeyboardEvent,
    scrollContainerRef: { element: HTMLDivElement | null },
    registeredHotkeys: HotkeyRegister,
    executeAction: Function
) {
    // Check if there's an active text selection within the subtitle content area
    const selection = window.getSelection();
    let isInSubtitleContent = false;

    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;

        // Check if the selection's common ancestor is within our subtitle container
        const ancestorElement =
            commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : (commonAncestor as HTMLElement);

        isInSubtitleContent = scrollContainerRef.element?.contains(ancestorElement) || false;
    }

    // Fallback: check if the event target is within subtitle content
    if (!isInSubtitleContent) {
        const target = e.target as HTMLElement;
        isInSubtitleContent = scrollContainerRef.element?.contains(target) || false;
    }

    // Only proceed if we're in the subtitle content area
    if (!isInSubtitleContent) {
        return;
    }

    // Build hotkey string
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Cmd");

    let key = e.key;
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);

    const hotkeyString = parts.join(" + ");

    // Check if this matches a registered hotkey
    const action = Object.entries(registeredHotkeys).find(([k, v]) => v === hotkeyString)?.[0];
    if (action) {
        e.preventDefault();
        executeAction(action);
    }
}

export function segmentsArrsAreTheSame(segmentArrOne: ParsedSegmentObj[], segmentArrTwo: ParsedSegmentObj[]) {
    if (segmentArrOne.length !== segmentArrTwo.length) {
        console.warn("Segment arrays had differing lengths:", segmentArrOne.length, segmentArrTwo.length);
        return false;
    }
    for (let i = 0; i < segmentArrOne.length; i++) {
        if (segmentArrOne[i].timecode != segmentArrTwo[i].timecode) {
            return false;
        }
    }
    return true;
}
