// cypress/e2e/basic-divs.cy.js
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

	it('scrolls down to the right place when prompted', () => {
		// step 1: show that it's at the top of the page
		cy.window().its('scrollY').should('equal', 0);
		// step 2: implement scroll to position
		cy.window().its('devtoolsScroller').should('exist');

		cy.window().then((win) => {
			console.log('Before scroll:', win.scrollY);
			win.devtoolsScroller(1000);
			console.log('After scroll call:', win.scrollY);
			cy.wait(100);
			console.log('After wait:', win.scrollY);
			// step 3: show it's scrolled down to that div. The  subtitle's text is now on screen!
			cy.window().its('scrollY').should('be.greaterThan', 0);
		});
	});
});
