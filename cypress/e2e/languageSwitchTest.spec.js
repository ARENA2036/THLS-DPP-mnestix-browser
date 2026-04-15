describe('Language Switch', () => {
    it('changes the language from german to all available languages and shows correct values', () => {
        cy.visit('/de');

        cy.contains('DPP Generator').should('be.visible');
        cy.contains('Erstellen Sie DPPs').should('be.visible');

        // spanish
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-es"]').click();

        cy.contains('DPP Generator').should('be.visible');
        cy.contains('Cree DPPs').should('be.visible');

        // english
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-en"]').click();

        cy.contains('DPP Generator').should('be.visible');
        cy.contains('Create DPPs').should('be.visible');

        // back to german
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-de"]').click();

        cy.contains('DPP Generator').should('be.visible');
        cy.contains('Erstellen Sie DPPs').should('be.visible');
    });
});
