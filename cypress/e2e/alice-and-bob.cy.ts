/// <reference types="cypress" />
import "../support/e2e.ts";

describe("Alice and Bob can use WhisperGrid to have a conversation", () => {
  const password1 = "Alice_Password";
  const password2 = "Wilt.Synergy.Encounter.Recovery8";

  const crossTestAliases = {
    invitation: undefined,
    aliceThumbprint: undefined,
    bobThumbprint: undefined,
    bobToAlice: undefined,
    threadURL: undefined,
    beforeKeys: undefined,
    relaySetup: undefined,
  };
  beforeEach(() => {
    Object.entries(crossTestAliases).forEach(([key, value]) => {
      cy.wrap(value).as(key);
    });
    cy.clearLocalStorage();
    cy.visit("http://localhost:1234/");
  });
  afterEach(() => {
    Object.entries(crossTestAliases).forEach(([key]) => {
      cy.get("@" + key).then((val) => {
        crossTestAliases[key] = val;
      });
    });
  });

  it("Alice creates an invite", () => {
    cy.createIdentity(password1).as("aliceThumbprint");
    cy.makeInvite("Alice", "Automated test invitation").as("invitation");
    cy.downloadBackup("alice1.jws.txt", password2);
  });

  it("Bob replies to invite", () => {
    cy.get<string>("@invitation")
      .then((invitation) => {
        cy.createIdentity("Bobs_Password").as("bobThumbprint");
        const reply = cy.replyToInvite(
          invitation,
          "Bob",
          "Hello Alice, this is a test",
        );
        return reply;
      })
      .as("bobToAlice");

    cy.downloadBackup("bob1.jws.txt", password2);
  });

  it("Alice views Bob's reply", () => {
    cy.openBackup("alice1.jws.txt", password2);
    cy.get('[role="menuitem"]')
      .contains("(Alice) Automated test invitation")
      .click({ force: true });

    cy.get("button").contains("Decrypt reply").click();
    cy.get<string>("@bobToAlice").then((bobToAlice) => {
      cy.labeledInput("Encrypted Message").paste(bobToAlice);
    });
    cy.contains("Hello Alice, this is a test");
    cy.window()
      .then((win) => {
        const keys: Array<string | null> = [];
        for (let i = 0; i < win.localStorage.length; i++) {
          keys.push(win.localStorage.key(i));
        }
        return keys.sort();
      })
      .as("beforeKeys");
    cy.downloadBackup("alice2.jws.txt", password2);
  });

  it("localStorage keys match after restoring backup with an active conversation", () => {
    cy.openBackup("alice2.jws.txt", password2);

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

  it("Bob adds a relay", () => {
    cy.openBackup("bob1.jws.txt", password2);

    cy.get('[role="menuitem"]')
      .contains(/^thread/)
      .click();

    cy.get('input[role="combobox"]').click();
    cy.contains("ntfy.sh").click();

    // The URL should include the protocol, host, and a single path segment (topic)
    cy.labeledInput("Relay URL")
      .invoke("val")
      .should("match", /^https?:\/\/ntfy.sh\/[^/]+$/);
    cy.contains("OK").click();

    cy.labeledInput("Message").type(
      "Hello Alice, this message includes setting up a Relay{enter}",
    );

    cy.copyButtonText("Copy").as("relaySetup");

    cy.downloadBackup("bob2.jws.txt", password2);

    cy.visit("http://localhost:1234/");
    cy.openBackup("alice2.jws.txt", password2);

    cy.get('[role="menuitem"]')
      .contains(/^thread/)
      .click();

    cy.get("@relaySetup").then((relaySetup) => {
      cy.labeledInput("Message").type(relaySetup + "{enter}");
    });
    cy.downloadBackup("alice3.jws.txt", password2);
  });

  it("Alice sends Bob a message through the relay", () => {
    cy.openBackup("alice3.jws.txt", password2);
    cy.get('[role="menuitem"]')
      .contains(/^thread/)
      .click();

    cy.labeledInput("Message").type(
      "Hello Bob, this message is relayed{enter}",
    );
    cy.contains("Sending message to relay:");
    cy.downloadBackup("alice4.jws.txt", password2);
  });

  it("Bob views Relayed message", () => {
    cy.openBackup("bob2.jws.txt", password2);
    cy.get('[role="menuitem"]')
      .contains(/^thread/)
      .click();

    cy.contains("Hello Bob, this message is relayed");
    cy.labeledInput("Message").type("Relay reply to Alice{enter}");
    cy.contains("Sending message to relay:");
    cy.downloadBackup("bob3.jws.txt", password2);
  });

  it("Alice recieves Relayed message", () => {
    cy.openBackup("alice4.jws.txt", password2);
    cy.get('[role="menuitem"]')
      .contains(/^thread/)
      .click();

    cy.contains("Relay reply to Alice");
  });
});
