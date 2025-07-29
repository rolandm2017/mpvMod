// cypress/e2e/basic-divs.cy.js
import { SUBTITLE_CONSTANTS } from '../../src/lib/constants';

describe('Page Structure', () => {
    beforeEach(() => {
        // Launch your Electron app or visit the page
        cy.visit('/'); // adjust path as needed
    });

    it('contains required div structure', () => {
        // Check that container div exists
        cy.get('.container').should('exist');

        // Check that subtitle-panel div exists
        cy.get('.subtitle-panel').should('exist');

        // Verify subtitle-panel is inside container (if that's your structure)
        cy.get('.container').within(() => {
            cy.get('.subtitle-panel').should('exist');
        });
    });

    it('verifies div visibility', () => {
        // Make sure they're actually visible, not just in the DOM
        cy.get('.container').should('be.visible');
        cy.get('.subtitle-panel').should('be.visible');
    });

    it("loads all the subtitles' divs", () => {
        const countOfSampleDotSrtSubtitles = 434;
        cy.get('.subtitle-content .subtitle-segment').should(
            'have.length',
            countOfSampleDotSrtSubtitles
        );
    });

    it('detects the test integer ', () => {
        cy.window().should('have.property', 'testInteger', 99);
    });

    it('has numerous basic qualities required for testing', async () => {
        cy.window().then(async (win) => {
            const testData = await win.pageReadyPromise;
            expect(testData).to.exist();
            expect(testData.db).to.exist();
            expect(testData.db.subtitleHeights).to.exist();
            expect(testData.allSegmentsMounted).to.be.true;
        });
    });

    it('reports the heights for every component when mounting is done', async () => {
        cy.window().then(async (win) => {
            // Option 1: Wait for the promise (if using Solution 1)
            const testData = await win.pageReadyPromise;
            console.log('Test data from promise:', testData);
            expect(testData.allSegmentsMounted).to.be.true;
            expect(testData.db.subtitleHeights.size).to.equal(
                SUBTITLE_CONSTANTS.TOTAL_COUNT
            );
        });
    });

    it('has each subtitle timing accessible, and each one has a height', async () => {
        cy.window().then(async (win) => {
            // Option 1: Wait for the promise (if using Solution 1)
            const testData = await win.pageReadyPromise;
            console.log('Test data from promise:', testData);
            expect(testData.allSegmentsMounted).to.be.true;
            // subtitle timings are all available
            expect(testData.subtitleCuePointsInSec.length).to.equal(
                SUBTITLE_CONSTANTS.TOTAL_COUNT
            );
            expect(testData.subtitleCuePointsInSec.every((el) => el > 0)).to.be
                .true;
            // each one has an associated height
            for (const subtitleTiming of testData.subtitleCuePointsInSec) {
                expect(testData.subtitleHeights.get(subtitleTiming)).to.exist();
                expect(
                    testData.subtitleHeights.get(subtitleTiming)
                ).to.be.greaterThan(0);
            }
        });
    });

    it('scrolls down to the right place when prompted', async () => {
        // step 1: show that it's at the top of the page
        cy.window().its('scrollY').should('equal', 0);
        // step 2: implement scroll to position
        cy.window().its('devtoolsScroller').should('exist');

        cy.window().then(async (win) => {
            // Option 1: Wait for the promise (if using Solution 1)
            await win.pageReadyPromise;
            console.log('Before scroll:', win.scrollY);
            win.devtoolsScroller(1000);
            console.log('After scroll call:', win.scrollY);
            cy.wait(100);
            console.log('After wait:', win.scrollY);
            // step 3: show it's scrolled down to that div. The  subtitle's text is now on screen!
            cy.window().its('scrollY').should('be.greaterThan', 0);

            // step 4: exactly where should it be?
        });
    });
});
