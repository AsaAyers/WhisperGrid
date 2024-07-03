/// <reference types="cypress" />
import "../support/e2e.ts";

it("Backup and restore an account with an invite", () => {
  cy.visit("http://localhost:1234/");
  cy.clearLocalStorage();
  const password1 = "Alice_Password";
  cy.createIdentity(password1).as("aliceThumbprint");
  cy.makeInvite("Alice", "Automated test invitation").as("invitation");
  const password2 = "Wilt.Synergy.Encounter.Recovery8";
  downloadBackup(password2);
  cy.contains("Delete all data").click();
  cy.contains("Are you sure you want to delete all data?");
  cy.contains("OK").click({ force: true });

  cy.get<string>("@invitation")
    .then((invitation) => {
      cy.createIdentity("Bobs_Password").as("bobThumbprint");
      return cy.replyToInvite(invitation, "Bob", "Hello Alice, this is a test");
    })
    .as("bobToAlice");
  cy.logout();

  cy.get<string>("@aliceThumbprint").then((aliceThumbprint) => {
    return cy.openBackup(aliceThumbprint, password2);
  });
  cy.get('[role="menuitem"]')
    .contains("(Alice) Automated test invitation")
    .click({ force: true });

  cy.get("button").contains("Decrypt reply").click();
  cy.get<string>("@bobToAlice").then((bobToAlice) => {
    cy.labeledInput("Encrypted Message").paste(bobToAlice);
  });

  cy.contains("Hello Alice, this is a test");
});
function downloadBackup(password: string) {
  cy.contains("Settings").click();
  cy.contains("Download password protected backup").click();
  cy.labeledInput("Password").type(password);
  cy.labeledInput("Confirm password").type(password);
  cy.contains("OK").click();
}
