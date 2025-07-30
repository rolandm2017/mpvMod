// cypress/e2e/basic-divs.cy.js
import { SUBTITLES } from '../../src/lib/constants';
import { SubtitleDatabase } from '../../src/lib/utils/subtitleDatabase';

describe('Page Structure', () => {
    beforeEach(() => {
        // Launch your Electron app or visit the page
        cy.visit('/'); // adjust path as needed
    });

    // FIXME: tracker stats are right but, the DB didn't h ear about all of them

    // it('detects the test integer ', () => {
    //     cy.window().should('have.property', 'testInteger', 99);
    // });

    // db: SubtitleDatabase;
    //     allSegmentsMounted: boolean;
    //     testInteger: number;

    it('has basic qualities required for testing', () => {
        cy.window().should('have.property', 'allSegmentsMounted', true);

        // Now you can safely interact with your database/components
        // cy.get('[data-testid="subtitle-segment"]').should(
        //     'have.length.greaterThan',
        //     0
        // );
        cy.window().should('have.property', 'testInteger', 99);
        cy.window().should('have.property', 'db').and('be.an', 'object');
        cy.window().should('have.property', 'tracker').and('be.an', 'object');
    });

    it('gathers all datas into the db', () => {
        cy.window().should('have.property', 'allSegmentsMounted', true);

        cy.window()
            .its('db')
            .then((db) => {
                cy.window()
                    .its('tracker')
                    .then((tracker) => {
                        console.log(tracker.getStats(), 'get stats');

                        // VERY BASIC ASSERITONS
                        expect(db.subtitles.length).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.subtitleCuePointsInSec.length).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.subtitleTimingToTimecodesMap.size).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.timecodes.length).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.subtitleHeights.size).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                    });
            });
    });

    it('reports the heights for every component when mounting is done', () => {
        // TODO:
        cy.window().should('have.property', 'allSegmentsMounted', true);
        cy.window()
            .its('db')
            .then((db) => {
                expect(db.subtitleHeights.size).to.equal(SUBTITLES.TOTAL_COUNT);
                const bunchOfHeights = db.subtitleCuePointsInSec.map((s) =>
                    db.getHeightFromPlayerPosition(s)
                );
                expect(bunchOfHeights.length).to.equal(SUBTITLES.TOTAL_COUNT);
            });
    });

    it('has each subtitle timing accessible, and each one has a height', () => {
        cy.window().should('have.property', 'allSegmentsMounted', true);

        cy.window()
            .its('db')
            .then((db) => {
                // Option 1: Wait for the promise (if using Solution 1)
                console.log('Test data from promise:', db);
                // subtitle timings are all available
                expect(db.subtitleCuePointsInSec.length).to.equal(
                    SUBTITLES.TOTAL_COUNT
                );
                expect(db.subtitleCuePointsInSec.every((el) => el > 0)).to.be
                    .true;
                // each one has an associated height
                for (const subtitleTiming of db.subtitleCuePointsInSec) {
                    expect(
                        db.getHeightFromPlayerPosition(subtitleTiming)
                    ).to.be.greaterThan(0);
                }
            });
    });

    it('starts scrolled all the way up', () => {
        cy.window().its('scrollY').should('equal', 0);
        cy.get('[data-testid="scroll-container"]')
            .should('have.prop', 'scrollTop')
            .and('equal', 0);
    });

    it('devScroll works', () => {
        // step 1: show that it's at the top of the page
        cy.window().its('scrollY').should('equal', 0);
        cy.get('[data-testid="scroll-container"]')
            .should('have.prop', 'scrollTop')
            .and('equal', 0);

        cy.window().should('have.property', 'allSegmentsMounted', true);

        // step 2: implement scroll to position
        cy.window()
            .its('playerPositionDevTool')
            .should('exist')
            .then((playerPositionDevTool) => {
                cy.wait(30);

                cy.window().then((win) => {
                    console.log('Before scroll:', win.scrollY);
                });

                // step 2:  scroll to position
                cy.window().then((win) => {
                    win.playerPositionDevTool(1000);
                });

                // Wait for scroll to complete, then check
                cy.wait(100); // Give time for scroll animation/completion

                cy.get('[data-testid="scroll-container"]').then(
                    ($container) => {
                        const scrollTop = $container[0].scrollTop;
                        console.log('Container scrollTop:', scrollTop);
                        // why 4000? no idea
                        const someArbitraryLargeNumber = 4000;
                        expect(scrollTop).to.be.greaterThan(
                            someArbitraryLargeNumber
                        );
                    }
                );

                cy.get('[data-testid="scroll-container"]') // or however you select your scrollContainer
                    .should('have.prop', 'scrollTop')
                    .and('be.greaterThan', 900);
            });
    });

    //  (ง •̀_•́)ง🔥🔥🔥
    //  LEGENDARY TEST INCOMING

    //    (☞ﾟヮﾟ)☞ ✅
    //    Milestone test — do not break.

    it('scrolls down to the right place when prompted', () => {
        // step 1: show that it's at the top of the page
        cy.window().its('scrollY').should('equal', 0);
        cy.window().should('have.property', 'allSegmentsMounted', true);
        // step 2: scroll to position

        cy.window()
            .its('db')
            .then((db) => {
                // pick some midpoint kinda subtitle
                const choice = SUBTITLES.TOTAL_COUNT - 200;
            });

        cy.window().then((win) => {
            // Option 1: Wait for the promise (if using Solution 1)
            console.log('HEOIDrhjawesiufhiawseuhnrf');
            console.log('HEOIDrhjawesiufhiawseuhnrf');
            console.log('Before scroll:', win.scrollY);
            win.playerPositionDevTool(1000);
            console.log('After scroll call:', win.scrollY);
            cy.wait(100);
            console.log('After wait:', win.scrollY);
            // step 3: show it's scrolled down to that div. The  subtitle's text is now on screen!
            cy.window().its('scrollY').should('be.greaterThan', 0);

            cy.window().then((win) => {
                console.log('Window scrollY:', win.scrollY);

                cy.get('[data-testid="scroll-container"]').then(
                    ($container) => {
                        const scrollTop = $container[0].scrollTop;
                        console.log('Container scrollTop:', scrollTop);
                        console.log('Expected > 900, actual:', scrollTop);
                        expect(scrollTop).to.be.greaterThan(900);
                    }
                );
            });

            // step 4: exactly where should it be?
        });
    });
});
