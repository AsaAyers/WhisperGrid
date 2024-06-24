describe("Alice and Bob can use WhisperGrid to have a conversation", () => {
  beforeEach(() => {
    // Cypress starts out with a blank slate for each test
    // so we must tell it to visit our website with the `cy.visit()` command.
    // Since we want to visit the same URL at the start of all our tests,
    // we include it in our beforeEach function so that it runs before each test
    cy.visit("http://localhost:1234/");
    cy.clearLocalStorage();
  });

  it("Alice can create an invitation", () => {
    cy.createIdentity("AlicePassword").as("aliceThumbprint");

    cy.contains("Create Invitation").click();
    cy.contains("Nickname").type("Alice");
    cy.contains("Note").type("Automated test invitation{enter}");

    // cy.contains("Logout").click();
    // cy.get<string>("@aliceThumbprint").then((aliceThumbprint) => {
    //   cy.login(aliceThumbprint, "AlicePassword");
    // });
  });
});
