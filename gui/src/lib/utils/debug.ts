import type { SegmentMountingTracker } from './mountingTracker';
import type { SubtitleDatabase } from './subtitleDatabase';
//dsfasdf

function debugHighlightStyles(el: any) {
    console.log('=== DEBUGGING ELEMENT STYLES ===');
    console.log('Element:', el);
    console.log('Classes:', el.className);
    console.log('Has highlighted class:', el.classList.contains('highlighted'));

    // Check computed styles
    const computedStyle = window.getComputedStyle(el);
    console.log('Background color:', computedStyle.backgroundColor);
    console.log('Border left:', computedStyle.borderLeft);

    // Check if CSS is loaded
    const stylesheets = document.styleSheets;
    console.log('Number of stylesheets:', stylesheets.length);

    // Force style by directly setting it
    console.log('Setting style directly...');
    el.style.backgroundColor = '#ffeb3b';
    el.style.borderLeft = '4px solid #ff9800';
    console.log('Direct style applied');

    // Check if element is visible
    const rect = el.getBoundingClientRect();
    console.log('Element bounds:', rect);
    console.log('Element visible:', rect.width > 0 && rect.height > 0);
}

function highlightAll(db: SubtitleDatabase, mountingTracker: SegmentMountingTracker) {
    const foundElements = [];
    // made as a sanity check
    console.log('Highllighting all!');
    console.log('Highllighting all!');
    console.log('Highllighting all!');
    const triedToUse = [];
    for (const subtitle of db.subtitles) {
        const el = mountingTracker.getElement(subtitle.timecode);
        triedToUse.push(subtitle.timecode);
        if (el) {
            console.log('ADDING HIHGLIGHTI TO EL to el', el);
            el.classList.add('highlighted');

            // FORCE the visual styles directly
            // el.style.backgroundColor = '#ffeb3b';
            // el.style.borderLeft = '4px solid #ff9800';
            // el.style.transition = 'all 0.2s ease';

            if (triedToUse.length === 1) {
                // debugHighlightStyles(el);
            }

            console.log('does el have highlighted', el.classList.contains('highlighted'));
        } else {
            console.log('No el found', el, subtitle.timecode);
            throw new Error('No el found error');
        }
    }
    mountingTracker.inspectElements();

    // FOUND ELEMENTS IS ZERO
    console.log('Tried to use: ', triedToUse);
}
