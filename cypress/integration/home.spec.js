describe('The Home Page', () => {
    it('successfully loads', () => {
        // loads site and checks for both sign in buttons
        cy.visit('/')
        cy.get('[class *= "NavBar_signInButton"]')
        cy.get('[class *= "Landing_signInButton"]')
    })
})