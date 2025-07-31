import type { TimecodeString } from '$lib/types';
import { parseTimecodeToSeconds } from './parsing';
import type { SubtitleDatabase } from './subtitleDatabase';

interface SubtitleComponentInterface {
    highlight(): void;
    unhighlight(): void;
    getDomElement?(): HTMLElement;
}

export interface MountingStats {
    mountedCount: number;
    expectedCount: number;
    duplicates: Record<string, number>;
    allMounted: boolean;
    mountedTimecodes: string[];
}

// segmentMountingTracker.ts - Extracted, testable logic
export class SegmentMountingTracker {
    private mountedSegments = new Set<string>();
    private duplicateTimecodes = new Map<string, number>();

    private segmentElements = new Map<TimecodeString, HTMLDivElement>(); // timecode -> element reference
    private expectedCount: number;
    private allSegmentsMounted = false;

    private components = new Map<string, SubtitleComponentInterface>();

    constructor(expectedCount: number) {
        this.expectedCount = expectedCount;
    }

    storeSegmentPosition(
        timecode: string,
        y: number,
        element: HTMLDivElement,
        db: SubtitleDatabase
    ): { isComplete: boolean } {
        // Debug logging to catch duplicates
        if (this.mountedSegments.has(timecode)) {
            console.warn(`Duplicate timecode detected: ${timecode}`);
            this.duplicateTimecodes.set(
                timecode,
                (this.duplicateTimecodes.get(timecode) || 1) + 1
            );
        }

        const timecodeAsSeconds = parseTimecodeToSeconds(timecode);

        // Store the mounting attempt
        this.mountedSegments.add(timecode);

        // Store positions and elements
        db.setHeight(timecodeAsSeconds, y);
        if (db.subtitleHeights.size === 1) {
            // console.log('SEGMENT ELEMENT set key: ', timecode);
        }
        this.segmentElements.set(timecode, element);

        // Check completion
        const completedMounting =
            this.mountedSegments.size === this.expectedCount;

        if (completedMounting && !this.allSegmentsMounted) {
            this.allSegmentsMounted = true;
            // console.log('All segments mounted, positions ready');
        }

        return {
            isComplete: completedMounting,
        };
    }

    addComponent(timecode: string, component: SubtitleComponentInterface) {
        this.components.set(timecode, component);
    }

    getComponent(timecode: string): SubtitleComponentInterface | undefined {
        return this.components.get(timecode);
    }

    getStats(): MountingStats {
        return {
            mountedCount: this.mountedSegments.size,
            expectedCount: this.expectedCount,
            duplicates: Object.fromEntries(this.duplicateTimecodes),
            allMounted: this.allSegmentsMounted,
            mountedTimecodes: Array.from(this.mountedSegments).sort(),
        };
    }

    reset(): void {
        this.mountedSegments.clear();
        this.duplicateTimecodes.clear();
        this.allSegmentsMounted = false;
        this.segmentElements.clear();
    }

    // Get element for highlighting
    getElement(timecode: TimecodeString): HTMLDivElement | undefined {
        return this.segmentElements.get(timecode);
    }

    inspectElements() {
        console.log([...this.segmentElements.keys()], '89ru');
    }
}

// Pure validation function - easily testable
export function validateTimecodes(
    segments: Array<{ timecode: string; text: string }>
) {
    const timecodeFrequency = new Map<string, number>();
    const issues: string[] = [];

    segments.forEach((segment, index) => {
        const count = timecodeFrequency.get(segment.timecode) || 0;
        timecodeFrequency.set(segment.timecode, count + 1);

        if (count > 0) {
            issues.push(
                `Duplicate timecode "${segment.timecode}" found at index ${index}`
            );
        }

        if (!segment.timecode || segment.timecode.trim() === '') {
            issues.push(`Empty timecode at index ${index}`);
        }
    });

    return {
        isValid: issues.length === 0,
        issues,
        duplicateTimecodes: Array.from(timecodeFrequency.entries())
            .filter(([, count]) => count > 1)
            .map(([timecode, count]) => ({ timecode, count })),
        totalSegments: segments.length,
        uniqueTimecodes: timecodeFrequency.size,
    };
}
