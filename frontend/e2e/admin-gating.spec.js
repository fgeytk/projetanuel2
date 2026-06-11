import { expect, test } from '@playwright/test'

const ADMIN_PSEUDO = process.env.E2E_ADMIN_PSEUDO || 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''

test.describe('Gating admin par rôle', () => {
  test("visiteur non connecté : aucune entrée Admin dans l'UI", async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Administration' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  })

  test("utilisateur simple : menu compte sans entrée Administration", async ({ page }) => {
    const pseudo = `e2e-user-${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.getByRole('button', { name: 'Inscription' }).click()
    await page.getByLabel('Pseudo').fill(pseudo)
    await page.getByLabel('Mot de passe').fill('motdepasse-e2e-solide')
    await page.getByRole('button', { name: "S'inscrire" }).click()

    await page.getByRole('button', { name: new RegExp(pseudo) }).click()
    await expect(page.getByRole('menuitem', { name: 'Profil' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Administration' })).toHaveCount(0)
  })

  test('admin : entrée Administration dans le menu compte uniquement', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await page.goto('/')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.getByLabel('Pseudo').fill(ADMIN_PSEUDO)
    await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Se connecter' }).last().click()

    // Pas d'onglet Admin dans la nav principale
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    await expect(nav.getByRole('button', { name: /admin/i })).toHaveCount(0)

    // Mais l'entrée existe dans le menu compte
    await page.getByRole('button', { name: new RegExp(ADMIN_PSEUDO) }).click()
    await page.getByRole('menuitem', { name: 'Administration' }).click()
    await expect(page.getByRole('heading', { name: 'Gestion des questions' })).toBeVisible()
  })
})
