/// <reference types="cypress" />
// cypress/support/commands.js
Cypress.Commands.add('launchElectron', () => {
	cy.exec('electron .'); // or however you launch your app
});
