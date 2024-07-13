/// <reference types="cypress" />
import "../support/e2e.ts";

it("Backup and restore an account with an invite", () => {
  cy.visit("http://localhost:1234/");
  cy.clearLocalStorage();
  const password1 = "Alice_Password";
  cy.createIdentity(password1).as("aliceThumbprint");
  cy.makeInvite("Alice", "Automated test invitation").as("invitation");
  const password2 = "Wilt.Synergy.Encounter.Recovery8";
  downloadBackup(password2, "alice1.jws.txt");
  cy.contains("Delete all data").click();
  cy.contains("Are you sure you want to delete all data?");
  cy.contains("OK").click({ force: true });

  cy.get<string>("@invitation")
    .then((invitation) => {
      cy.createIdentity("Bobs_Password").as("bobThumbprint");
      return cy.replyToInvite(invitation, "Bob", "Hello Alice, this is a test");
    })
    .as("bobToAlice");
  cy.contains("Settings").click({ force: true });
  cy.contains("Delete all data").click();
  cy.contains("Are you sure you want to delete all data?");
  cy.contains("OK").click({ force: true });

  cy.openBackup("alice1.jws.txt", password2);
  cy.get('[role="menuitem"]')
    .contains("(Alice) Automated test invitation")
    .click({ force: true });

  cy.get("button").contains("Decrypt reply").click();
  cy.get<string>("@bobToAlice").then((bobToAlice) => {
    cy.labeledInput("Encrypted Message").paste(bobToAlice);
  });
  cy.contains("Hello Alice, this is a test");
  cy.url().as("threadURL");

  downloadBackup(password2, "alice2.jws.txt");
  cy.window()
    .then((win) => {
      const keys: Array<string | null> = [];
      for (let i = 0; i < win.localStorage.length; i++) {
        keys.push(win.localStorage.key(i));
      }
      return keys.sort();
    })
    .as("beforeKeys");
  cy.clearLocalStorage();

  cy.get<string>("@threadURL").then((threadURL) => {
    cy.visit(threadURL);
    cy.openBackup("alice2.jws.txt", password2);
  });

  cy.get('[role="menuitem"]')
    .contains("(Alice) Automated test invitation")
    .click({ force: true });
  cy.window()
    .then((win) => {
      const keys: Array<string | null> = [];
      for (let i = 0; i < win.localStorage.length; i++) {
        keys.push(win.localStorage.key(i));
      }
      return keys.sort();
    })
    .as("afterKeys");

  cy.get("@beforeKeys").then((before) => {
    cy.get("@afterKeys").should("deep.equal", before);
  });
});
function downloadBackup(password: string, filename?: string) {
  cy.contains("Settings").click({ force: true });
  cy.contains("Download password protected backup").click();
  cy.labeledInput("Password").type(password);
  cy.labeledInput("Confirm password").type(password);
  if (filename) {
    cy.labeledInput("Filename").clear().type(filename);
    // cy.pause();
  }
  cy.contains("OK").click();
  cy.wait(500);
}
