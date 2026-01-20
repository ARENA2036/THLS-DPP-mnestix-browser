describe('Language Switch', () => {
    it('changes the language from german to all available languages and shows correct values', () => {
        cy.visit('/de');

        cy.contains('Digitaler Zwilling').should('be.visible');

        // spanish
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-es"]').click();

        cy.contains('Simplificando').should('be.visible');
        // english
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-en"]').click();

        cy.contains('Digital Twin').should('be.visible');

        // back to german
        cy.getByTestId('language-selector').click();
        cy.get('[data-testid="language-de"]').click();

        cy.contains('Digitaler Zwilling').should('be.visible');
    });
});
