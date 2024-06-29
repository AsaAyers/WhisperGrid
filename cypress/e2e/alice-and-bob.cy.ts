describe("Alice and Bob can use WhisperGrid to have a conversation", () => {
  beforeEach(() => {
    // Cypress starts out with a blank slate for each test
    // so we must tell it to visit our website with the `cy.visit()` command.
    // Since we want to visit the same URL at the start of all our tests,
    // we include it in our beforeEach function so that it runs before each test
    cy.visit("http://localhost:1234/");
    cy.clearLocalStorage();
  });

  it("alice-and-bob generated keys", () => {
    cy.then(() => {
      console.clear();
    });
    cy.clearLocalStorage();
    const alicePassword = "Alice_Password";
    const bobPassword = "Bob_Password";

    cy.createIdentity(alicePassword).as("aliceThumbprint");
    cy.scre("alice-identity");

    cy.contains("Create Invitation").click();
    cy.contains("Nickname").type("Alice");
    cy.contains("Note").type("Automated test invitation{enter}");

    cy.copyButtonText("Copy").as("invitation");
    cy.scre("alice-invitation");
    cy.contains("Expand").click();
    cy.scre("alice-invitation-expanded");

    cy.contains("Logout").click();
    cy.createIdentity(bobPassword).as("bobThumbprint");

    cy.contains("Reply to invite").click();

    cy.get<string>("@invitation").then((invitation) => {
      cy.get("textarea").paste(invitation);
    });
    cy.labeledInput("Nickname").type("Bob");
    cy.labeledInput("Message").type(
      "Hello Alice, this is a message for testing Whisper Grid{enter}"
    );

    cy.contains("Expand").click();
    cy.copyButtonText("Copy").as("bobToAlice");
    cy.scre("bob-reply");
    cy.contains("Logout").click();

    cy.get<string>("@aliceThumbprint").then((aliceThumbprint) => {
      return cy.login(aliceThumbprint, alicePassword);
    });

    cy.get('[role="menuitem"]')
      .contains("(Alice) Automated test invitation")
      .click();

    cy.get("button").contains("Decrypt reply").click();
    cy.get<string>("@bobToAlice").then((bobToAlice) => {
      cy.labeledInput("Encrypted Message").paste(bobToAlice);
    });
    cy.get("button").contains("Decrypt").click({ force: true });

    cy.scre("alice-view-thread");
    cy.scre("alice-view");
  });
});
