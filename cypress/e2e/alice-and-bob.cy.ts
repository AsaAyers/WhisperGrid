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
    cy.contains("Create Identity").click();
    cy.contains("Password").type("AlicePassword");
    cy.contains("Confirm password").type("AlicePassword{enter}");

    cy.contains(/id-[a-zA-Z0-9_-]+/)
      .invoke("text")
      .as("aliceThumbprint");

    cy.contains("Create Invitation").click();
    cy.contains("Nickname").type("Alice");
    cy.contains("Note").type("Automated test invitation{enter}");

    cy.contains("Logout").click();

    cy.contains("Thumbprint").invoke("attr", "for").as("thumbprintId");
    cy.get("@thumbprintId").then((thumbprintId) => {
      cy.get(`#${thumbprintId}`).clear();
    });
    // .clear().type("@aliceThumbprint");
  });
});
