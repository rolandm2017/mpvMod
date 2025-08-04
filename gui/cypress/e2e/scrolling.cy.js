// cypress/e2e/basic-divs.cy.js
import { SUBTITLES } from "../../src/lib/constants";

describe("Page Structure", () => {
    beforeEach(() => {
        // Launch your Electron app or visit the page
        cy.visit("/"); // adjust path as needed
    });

    // FIXME: tracker stats are right but, the DB didn't h ear about all of them

    // it('detects the test integer ', () => {
    //     cy.window().should('have.property', 'testInteger', 99);
    // });

    // db: SubtitleDatabase;
    //     allSegmentsMounted: boolean;
    //     testInteger: number;

    it("has basic qualities required for testing", () => {
        cy.window().should("have.property", "allSegmentsMounted", true);

        // Now you can safely interact with your database/components
        // cy.get('[data-testid="subtitle-segment"]').should(
        //     'have.length.greaterThan',
        //     0
        // );
        cy.window().should("have.property", "testInteger", 99);
        cy.window().should("have.property", "db").and("be.an", "object");
        cy.window().should("have.property", "tracker").and("be.an", "object");
    });

    it("gathers all datas into the db", () => {
        cy.window().should("have.property", "allSegmentsMounted", true);

        cy.window()
            .its("db")
            .then((db) => {
                cy.window()
                    .its("tracker")
                    .then((tracker) => {
                        console.log(tracker.getStats(), "get stats");

                        // VERY BASIC ASSERITONS
                        expect(db.subtitles.length).to.equal(SUBTITLES.TOTAL_COUNT);
                        expect(db.subtitleCuePointsInSec.length).to.equal(SUBTITLES.TOTAL_COUNT);
                        expect(db.subtitleTimingToTimecodesMap.size).to.equal(SUBTITLES.TOTAL_COUNT);
                        expect(db.timecodes.length).to.equal(SUBTITLES.TOTAL_COUNT);
                        expect(db.subtitleHeights.size).to.equal(SUBTITLES.TOTAL_COUNT);
                    });
            });
    });

    it("reports the heights for every component when mounting is done", () => {
        // TODO:
        cy.window().should("have.property", "allSegmentsMounted", true);
        cy.window()
            .its("db")
            .then((db) => {
                expect(db.subtitleHeights.size).to.equal(SUBTITLES.TOTAL_COUNT);
                const bunchOfHeights = db.subtitleCuePointsInSec.map((s) => db.getHeightFromPlayerPosition(s));
                expect(bunchOfHeights.length).to.equal(SUBTITLES.TOTAL_COUNT);
            });
    });

    it("has each subtitle timing accessible, and each one has a height", () => {
        cy.window().should("have.property", "allSegmentsMounted", true);

        cy.window()
            .its("db")
            .then((db) => {
                // Option 1: Wait for the promise (if using Solution 1)
                cy.log("Test data from promise:", db);
                // subtitle timings are all available
                expect(db.subtitleCuePointsInSec.length).to.equal(SUBTITLES.TOTAL_COUNT);
                expect(db.subtitleCuePointsInSec.every((el) => el > 0)).to.be.true;
                // each one has an associated height
                for (const subtitleTiming of db.subtitleCuePointsInSec) {
                    expect(db.getHeightFromPlayerPosition(subtitleTiming)).to.be.greaterThan(0);
                }
            });
    });

    it("starts scrolled all the way up", () => {
        cy.window().its("scrollY").should("equal", 0);
        cy.get('[data-testid="scroll-container"]').should("have.prop", "scrollTop").and("equal", 0);
    });

    it("devScroll works", () => {
        // step 1: show that it's at the top of the page
        cy.window().its("scrollY").should("equal", 0);
        cy.get('[data-testid="scroll-container"]').should("have.prop", "scrollTop").and("equal", 0);

        cy.window().should("have.property", "allSegmentsMounted", true);

        // step 2: implement scroll to position
        cy.window()
            .its("playerPositionDevTool")
            .should("exist")
            .then((playerPositionDevTool) => {
                cy.wait(30);

                // step 2:  scroll to position
                cy.window().then((win) => {
                    win.playerPositionDevTool(1000);
                });

                // Wait for scroll to complete, then check
                cy.wait(100); // Give time for scroll animation/completion

                cy.get('[data-testid="scroll-container"]').then(($container) => {
                    const scrollTop = $container[0].scrollTop;
                    // why 4000? no idea
                    const someArbitraryLargeNumber = 4000;
                    expect(scrollTop).to.be.greaterThan(someArbitraryLargeNumber);
                });

                cy.get('[data-testid="scroll-container"]') // or however you select your scrollContainer
                    .should("have.prop", "scrollTop")
                    .and("be.greaterThan", 900);
            });
    });

    //  (ง •̀_•́)ง🔥🔥🔥
    //  LEGENDARY TEST INCOMING

    //    (☞ﾟヮﾟ)☞ ✅
    //    Milestone test — do not break.

    it("scrolls down to the right place when prompted", () => {
        // step 1: show that it's at the top of the page
        cy.window().its("scrollY").should("equal", 0);
        cy.window().should("have.property", "allSegmentsMounted", true);
        // step 2: scroll to position

        cy.window()
            .its("db")
            .should("exist")
            .then((db) => {
                expect(db.subtitles.length).to.equal(SUBTITLES.TOTAL_COUNT);
                // pick some midpoint kinda subtitle
                const choice = SUBTITLES.TOTAL_COUNT - 200;
                //   playerPosition,
                //         db,
                //         scrollContainer
                const targetIndex = choice;
                // TODO: Install a "min and max" property for all timestamps
                const playerPosition = db.subtitleCuePointsInSec[choice];

                const expectedSubtitle = db.subtitles.find((s) => s.timecodeInSeconds === playerPosition);
                const expectedText = expectedSubtitle.text;
                // now just execute the devtoolScroll
                cy.window().then((win) => {
                    // The " - 1" makes it work
                    win.playerPositionDevTool(playerPosition - 1);
                    cy.wait(40);

                    //DEBUG:
                    cy.get('[data-testid="scroll-container"]').within(() => {
                        const visibleTexts = [];
                        cy.get("*").each(($el) => {
                            if ($el.is(":visible") && $el.text().trim()) {
                                visibleTexts.push($el.text().trim());
                            }
                        });
                    });

                    cy.get('[data-testid="scroll-container"] [data-testid^="subtitle-segment-"]:visible').then(
                        ($visibleElements) => {
                            const testIds = [];
                            $visibleElements.each((index, el) => {
                                const testId = el.getAttribute("data-testid");
                                testIds.push(testId);
                                const className = el.className;
                                cy.log(`${testId} - classes: ${className}`);
                            });
                            console.log("Visible test IDs:", testIds.join(", "));
                            console.log("And target: ", `subtitle-segment-${targetIndex}`);
                            expect(testIds).to.include(`subtitle-segment-${targetIndex}`);
                        }
                    );

                    cy.get(`[data-testid="subtitle-segment-${targetIndex}"]`).then(($el) => {
                        // Custom assertion for "meaningful visibility" (e.g., at least 50% visible)
                        const rect = $el[0].getBoundingClientRect();
                        const viewportHeight = Cypress.config("viewportHeight");
                        const elementHeight = rect.height;

                        const visibleTop = Math.max(0, rect.top);
                        const visibleBottom = Math.min(viewportHeight, rect.bottom);
                        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                        const visibilityRatio = visibleHeight / elementHeight;

                        expect(visibilityRatio).to.be.at.least(0.5, "Element should be at least 50% visible");
                    });
                });
            });
    });
});
