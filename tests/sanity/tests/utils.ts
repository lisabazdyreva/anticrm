import { Page } from '@playwright/test'

export async function openWorkbench (page: Page): Promise<void> {
  await page.goto('http://localhost:8083/login%3Acomponent%3ALoginApp/login')

  await page.evaluate(() => {
    localStorage.setItem('login:metadata:LoginToken', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InVzZXIxIiwid29ya3NwYWNlIjoic2FuaXR5LXdzIn0.hfUCqePHO-WNps2by4B-CYGKIpDpLG0WVCUUtU-SVI4')
    localStorage.setItem('login:metadata:LoginEmail', 'user1')
    localStorage.setItem('login:metadata:LoginEndpoint', 'ws://localhost:3334')
  })

  await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp')
  await page.waitForSelector('[id="app-contact\\:string\\:Contacts"]')
}