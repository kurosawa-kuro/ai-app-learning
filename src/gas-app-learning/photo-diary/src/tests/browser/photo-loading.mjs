// 報告された「通信後に画像が消える」を同じ1px PNGで検証する。画像デコードは実Chromium。
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { png } from '../drive-mock.mjs'
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.setContent('<div id="host"></div>')
  for (const path of ['client/core/dom.html', 'client/core/photo-view.html']) {
    await page.addScriptTag({ content: readFileSync(path, 'utf8').replace(/<\/?script>/g, '') })
  }
  await page.evaluate(() => {
    window.requests = []
    App.api = { getPhoto: () => new Promise(resolve => requests.push(resolve)) }
    document.querySelector('#host').append(App.photoView.img({ file_id: 'fixture', kind: 'drive', label: '検証画像' }))
  })
  await page.waitForFunction(() => requests.length === 1)
  assert.equal(await page.locator('#host img').getAttribute('src'), null)
  assert.equal(await page.locator('.app-photo-status').textContent(), '画像を読み込み中…')
  await page.evaluate(base64 => requests.shift()({ mimeType: 'image/png', base64 }), png)
  await page.waitForFunction(() => document.querySelector('.app-photo-frame').dataset.state === 'ready')
  assert.equal(await page.locator('.app-photo-status').textContent(), '1×1ピクセルの画像です')
  assert.deepEqual(await page.locator('img').evaluate(img => {
    const c = document.createElement('canvas'); c.width = c.height = 1
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
    return [...ctx.getImageData(0, 0, 1, 1).data]
  }), [255, 255, 255, 255])
  await page.evaluate(() => document.querySelector('#host').append(App.photoView.img({ file_id: 'broken', kind: 'drive' })))
  await page.waitForFunction(() => requests.length === 1)
  await page.evaluate(() => requests.shift()({ mimeType: 'image/png', base64: 'AAAA' }))
  await page.waitForFunction(() => document.querySelectorAll('.app-photo-frame')[1].dataset.state === 'error')
  const broken = page.locator('.app-photo-frame').nth(1)
  assert.equal(await broken.locator('img').getAttribute('src'), null)
  assert.equal(await broken.locator('button').isVisible(), true)
  await broken.locator('button').click()
  await page.waitForFunction(() => requests.length === 1)
  const normal = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 20; c.height = 10
    const ctx = c.getContext('2d'); ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 20, 10)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.evaluate(base64 => requests.shift()({ mimeType: 'image/png', base64 }), normal)
  await page.waitForFunction(() => document.querySelectorAll('.app-photo-frame')[1].dataset.state === 'ready')
  assert.equal(await broken.locator('.app-photo-status').isHidden(), true)
  assert.equal(await broken.locator('img').evaluate(i => i.naturalWidth), 20)
  console.log('成功：通信前の読込表示→実1px白画像の明示／デコード失敗→再取得→通常画像の表示')
} finally { await browser.close() }
