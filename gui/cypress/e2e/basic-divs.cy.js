// cypress/e2e/basic-divs.cy.js
import { SUBTITLES } from '../../src/lib/constants';
import { SubtitleDatabase } from '../../src/lib/utils/subtitleDatabase';

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

    // TEST that the DIVS all load.

    it('loads all 434 divs from the SRT file', () => {
        cy.get('.subtitle-content')
            .children('div') // This gets only direct children that are divs
            .should('have.length', 434)
            .then(($segments) => {
                const renderedCount = $segments.length;

                // Compare with your data source
                cy.window().then((win) => {
                    // Adjust this path to match how you access your data
                    const dataCount = SUBTITLES.TOTAL_COUNT;
                    expect(renderedCount).to.equal(dataCount);
                    cy.log(
                        `Data has ${dataCount} segments, rendered ${renderedCount} divs`
                    );
                });
            });
    });
});
