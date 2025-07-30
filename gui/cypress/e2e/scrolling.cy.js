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
                        expect(db.timePositionsToTimecodes.size).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.timecodes.length).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        expect(db.subtitleHeights.size).to.equal(
                            SUBTITLES.TOTAL_COUNT
                        );
                        // here is all the SRT's timings
                        const allSrtTimings = db.subtitleCuePointsInSec;
                        const firstSubtitleTiming =
                            db.subtitleHeights.getHeight(allSrtTimings[0]);
                        expect(firstSubtitleTiming).to.be.equal(0); // bc its at the start
                        console.log(
                            'HERE dsifahndskifhasdfkjhdsalifasdhflidash'
                        );
                        console.log(
                            'HERE dsifahndskifhasdfkjhdsalifasdhflidash'
                        );
                        console.log(
                            'HERE dsifahndskifhasdfkjhdsalifasdhflidash'
                        );
                        console.log(
                            'HERE dsifahndskifhasdfkjhdsalifasdhflidash'
                        );
                        console.log(db, '85ru');
                        expect(db.subtitleHeights.size).to.be.greaterThan(0);
                        expect(firstSubtitleTiming).to.be.greaterThan(0);
                        // other db property assertions
                    });
            });
    });

    it('reports the heights for every component when mounting is done', () => {
        // TODO:
        // cy.window().should('have.property', 'allSegmentsMounted', true);
        // cy.window()
        //     .its('db')
        //     .then((db) => {
        //         expect(db.subtitleHeights.size).to.equal(SUBTITLES.TOTAL_COUNT);
        //         // here is all the SRT's timings
        //         const allSrtTimings = db.subtitleCuePointsInSec;
        //         const firstSubtitleTiming = db.subtitleHeights.getHeight(
        //             allSrtTimings[0]
        //         );
        //         expect(firstSubtitleTiming).to.be.equal(0); // bc its at the start
        //         console.log('HERE dsifahndskifhasdfkjhdsalifasdhflidash');
        //         console.log('HERE dsifahndskifhasdfkjhdsalifasdhflidash');
        //         console.log(db, '85ru');
        //         expect(db.subtitleHeights.size).to.be.greaterThan(0);
        //         expect(firstSubtitleTiming).to.be.greaterThan(0);
        //         // other db property assertions
        //     });
    });

    // it('has each subtitle timing accessible, and each one has a height', () => {
    //     cy.window().then((win) => {
    //         // Option 1: Wait for the promise (if using Solution 1)
    //         console.log('Test data from promise:', testData);
    //         expect(testData.allSegmentsMounted).to.be.true;
    //         // subtitle timings are all available
    //         expect(testData.subtitleCuePointsInSec.length).to.equal(
    //             SUBTITLES.TOTAL_COUNT
    //         );
    //         expect(testData.subtitleCuePointsInSec.every((el) => el > 0)).to.be
    //             .true;
    //         // each one has an associated height
    //         for (const subtitleTiming of testData.subtitleCuePointsInSec) {
    //             expect(testData.subtitleHeights.get(subtitleTiming)).to.exist();
    //             expect(
    //                 testData.subtitleHeights.get(subtitleTiming)
    //             ).to.be.greaterThan(0);
    //         }
    //     });
    // });

    it('starts scrolled all the way up', () => {
        cy.window().its('scrollY').should('equal', 0);
        cy.get('[data-testid="scroll-container"]')
            .should('have.prop', 'scrollTop')
            .and('equal', 0);
    });

    // it('devScroll works', () => {
    //     // step 1: show that it's at the top of the page
    //     cy.window().its('scrollY').should('equal', 0);
    //     cy.get('[data-testid="scroll-container"]')
    //         .should('have.prop', 'scrollTop')
    //         .and('equal', 0);
    //     // step 2: implement scroll to position
    //     cy.window().its('devtoolsScroller').should('exist');

    //     cy.window().then((win) => {
    //         expect(1).to.equal(2);
    //         // Option 1: Wait for the promise (if using Solution 1)
    //         console.log('Before scroll:', win.scrollY);
    //         win.devtoolsScroller(1000);
    //         console.log('After scroll call:', win.scrollY);
    //         cy.wait(100);
    //         console.log('After wait:', win.scrollY);

    //         cy.get('[data-testid="scroll-container"]').then(($container) => {
    //             const scrollTop = $container[0].scrollTop;
    //             console.log('Container scrollTop:', scrollTop);
    //             expect(scrollTop).to.be.greaterThan(900);
    //         });
    //         // step 3: show it's scrolled down to that div. The  subtitle's text is now on screen!
    //         cy.window().its('scrollY').should('be.greaterThan', 900);

    //         cy.get('[data-testid="scroll-container"]') // or however you select your scrollContainer
    //             .should('have.prop', 'scrollTop')
    //             .and('be.greaterThan', 900);

    //         expect(1).to.equal(2);

    //         // step 4: exactly where should it be?
    //     });
    // });

    // it('scrolls down to the right place when prompted', () => {
    //     // step 1: show that it's at the top of the page
    //     cy.window().its('scrollY').should('equal', 0);
    //     // step 2: implement scroll to position
    //     cy.window().its('devtoolsScroller').should('exist');

    //     console.log('HERe');
    //     console.log('HERe');
    //     console.log('HERe');
    //     cy.window().then((win) => {
    //         expect(1).to.equal(2);
    //         // Option 1: Wait for the promise (if using Solution 1)
    //         console.log('HEOIDrhjawesiufhiawseuhnrf');
    //         console.log('HEOIDrhjawesiufhiawseuhnrf');
    //         console.log('HEOIDrhjawesiufhiawseuhnrf');
    //         console.log('Before scroll:', win.scrollY);
    //         win.devtoolsScroller(1000);
    //         console.log('After scroll call:', win.scrollY);
    //         cy.wait(100);
    //         console.log('After wait:', win.scrollY);
    //         // step 3: show it's scrolled down to that div. The  subtitle's text is now on screen!
    //         cy.window().its('scrollY').should('be.greaterThan', 0);

    //         cy.window().then((win) => {
    //             console.log('Window scrollY:', win.scrollY);

    //             cy.get('[data-testid="scroll-container"]').then(
    //                 ($container) => {
    //                     const scrollTop = $container[0].scrollTop;
    //                     console.log('Container scrollTop:', scrollTop);
    //                     console.log('Expected > 900, actual:', scrollTop);
    //                     expect(scrollTop).to.be.greaterThan(900);
    //                 }
    //             );
    //         });

    //         // step 4: exactly where should it be?
    //     });
    // });
});
