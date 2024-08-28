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
Cypress.Commands.add(
  "login",
  (thumbprint, password, url = "http://localhost:3141/") => {
    cy.visit(url);
    cy.contains("Open locally stored identity").click();
    cy.labeledInput("Thumbprint").clear();
    cy.contains("Thumbprint").type(thumbprint);
    cy.contains("Password").type(password + "{enter}");
  },
);
Cypress.Commands.add("logout", () => {
  cy.contains("Logout").click();
  cy.visit("http://localhost:3141/");
});
Cypress.Commands.add("replyToInvite", (invitation, nickname, note = "") => {
  cy.contains("Reply to invite").click();
  cy.get("textarea").paste(invitation);
  cy.labeledInput("Set My Nickname").type(nickname);
  cy.labeledInput("Message").type(note + "{enter}");
  return cy.copyButtonText("Copy");
});
Cypress.Commands.add("makeInvite", (nickname, note = "") => {
  cy.contains("Create Invitation").click();
  cy.contains("Set My Nickname").type(nickname);
  cy.contains("Note").type(note + "{enter}");
  return cy.copyButtonText("Copy").then((invite) => {
    return invite;
  });
});
Cypress.Commands.add("downloadBackup", (filename, password) => {
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
});
Cypress.Commands.add("openBackup", (filename, password) => {
  cy.contains("Open Backup File").click();
  cy.wait(100);
  cy.get("input[type=file]").selectFile(`cypress/downloads/${filename}`, {
    force: true,
  });

  cy.labeledInput("File Password").type(password);
  cy.contains("Unlock").click();
  return cy
    .contains(/id-[a-zA-Z0-9_-]+/)
    .invoke("text")
    .then((aliceThumbprint) => {
      return aliceThumbprint;
    });
});
Cypress.Commands.add("createIdentity", (password) => {
  cy.visit("http://localhost:3141/");
  cy.contains("Create Identity").click();
  cy.contains("Password").type(password);
  cy.contains("Confirm password").type(password + "{enter}");

  return cy
    .contains(/id-[a-zA-Z0-9_-]+/)
    .invoke("text")
    .then((aliceThumbprint) => {
      return aliceThumbprint;
    });
});
Cypress.Commands.add("labeledInput", (label) => {
  return cy
    .get("label")
    .contains(label)
    .invoke("attr", "for")
    .then((forId) => {
      return cy.get(`#${forId}`);
    });
});

Cypress.Commands.add("copyButtonText", (label): Cypress.Chainable<string> => {
  cy.get(`[aria-label="${label}"]`).click();
  return cy.window().then((win) => {
    // @ts-expect-error This is a hack to avoid needing real permission to read
    // the clipboard.
    return win.cypressCopyText ?? "";
  });
});

Cypress.Commands.add("paste", { prevSubject: "element" }, (parent, text) => {
  cy.get(parent.selector!).focus().clear().type(text, {
    delay: 1,
    waitForAnimations: false,
  });
});

let screenshotIndex = 1;
beforeEach(() => {
  screenshotIndex = 1;
});
/**
 * I tried to override the built-in `cy.screenshot` command but it kept
 * complaining about me trying to screenshot a bunch of elements. I just want to
 * have defaults and auto-prefix the filenames.
 */
Cypress.Commands.add("scre", function (this, label) {
  // Is this run being recorded?
  const video = Cypress.config("video");
  if (video) {
    cy.then(() => new Promise((resolve) => setTimeout(resolve, 500)));
  } else {
    cy.screenshot(
      `${screenshotIndex++}_${
        this.currentTest?.title ?? this.test?.title
      }___${label}`,
      {
        capture: "fullPage",
        overwrite: true,
      },
    );
  }
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
      logout(): Chainable<void>;
      login(
        thumbprint: string,
        password: string,
        url?: string,
      ): Chainable<void>;
      createIdentity(password: string): Chainable<string>;
      openBackup(thumbprint: string, password: string): Chainable<string>;
      downloadBackup(filename: string, password: string): Chainable<string>;
      makeInvite(nickname: string, note?: string): Chainable<string>;
      replyToInvite(
        invite: string,
        nickname: string,
        note?: string,
      ): Chainable<string>;
      labeledInput(label: string): Chainable<JQuery<HTMLElement>>;
      copyButtonText(label: string): Chainable<string>;
      paste(text: string): Chainable<void>;
      scre(label: string): Chainable<void>;
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
