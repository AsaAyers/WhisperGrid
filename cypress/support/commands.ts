/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
Cypress.Commands.add("login", (thumbprint, password) => {
  cy.visit("http://localhost:1234/");
  cy.contains("Open locally stored identity").click();
  cy.labeledInput("Thumbprint").clear();
  cy.contains("Thumbprint").type(thumbprint);
  cy.contains("Password").type(password + "{enter}");
});
Cypress.Commands.add("createIdentity", (password) => {
  cy.visit("http://localhost:1234/");
  cy.contains("Create Identity").click();
  cy.contains("Password").type(password);
  cy.contains("Confirm password").type(password + "{enter}");

  return cy
    .contains(/id-[a-zA-Z0-9_-]+/)
    .invoke("text")
    .then((aliceThumbprint) => {
      console.log("a", aliceThumbprint);
      return aliceThumbprint;
    });
});
Cypress.Commands.add("labeledInput", (label) => {
  return cy
    .contains(label)
    .invoke("attr", "for")
    .then((forId) => {
      return cy.get(`#${forId}`);
    });
});
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
// Cypress.Commands.add(
//   "labeledInput",
//   { prevSubject: false },
//   (label: string): Chainable<Element> => {
//     return cy
//       .contains(label)
//       .invoke("attr", "for")
//       .then((forId) => {
//         return cy.get(`#${forId}`);
//       });
//   }
// );
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(thumbprint: string, password: string): Chainable<void>;
      createIdentity(password: string): Chainable<string>;
      labeledInput(label: string): Chainable<JQuery<HTMLElement>>;
      // drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>;
      // dismiss(
      //   subject: string,
      //   options?: Partial<TypeOptions>
      // ): Chainable<Element>;
      // visit(
      //   originalFn: CommandOriginalFn,
      //   url: string,
      //   options: Partial<VisitOptions>
      // ): Chainable<Element>;
    }
  }
}

export {};
