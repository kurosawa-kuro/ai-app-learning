// 実Chromiumの画像デコード・Canvas・DOMを検証する。GAS/Drive/Gemini通信は模擬。
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { renderIndex } from '../gas-mock.mjs'
import { driveGas, png } from '../drive-mock.mjs'

const browser = await chromium.launch()
const results = []
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const gas = driveGas(), calls = [], errors = []
    gas.run('APP_CONFIG.providers.photo="drive"; APP_CONFIG.providers.draft="gemini"; GeminiClient.generateText=()=>({ok:true,text:JSON.stringify({title:"作例の日記",body:"画像をもとにした作例です。"})})')
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 })
    const page = await context.newPage()
    let uploadCount = 0
    page.on('pageerror', error => errors.push(error.message))
    page.on('dialog', dialog => dialog.accept())
    await page.exposeFunction('testRpc', (name, args) => {
      calls.push(name)
      if (name === 'uploadPhoto' && ++uploadCount === 2) throw Error('検証用の一時的な通信失敗')
      return gas.call(name, ...args)
    })
    await page.addInitScript(() => {
      const runner = (ok, fail) => new Proxy({}, { get(_, name) {
        if (name === 'withSuccessHandler') return cb => runner(cb, fail)
        if (name === 'withFailureHandler') return cb => runner(ok, cb)
        return (...args) => window.testRpc(name, args).then(ok, fail)
      } })
      window.google = { script: {
        get run() { return runner() },
        url: { getLocation: cb => cb({ hash: location.hash.slice(1) }) },
        history: {
          setChangeHandler(cb) { window.addEventListener('popstate', e => cb({ state: e.state, location: { hash: location.hash.slice(1) } })) },
          push: (state, _, hash) => history.pushState(state, '', '#' + hash),
          replace: (state, _, hash) => history.replaceState(state, '', '#' + hash),
        },
      } }
    })
    await page.route('http://diary.test/**', route => route.fulfill({ contentType: 'text/html', body: renderIndex(gas.run('clientConfig_()')) }))
    await page.goto('http://diary.test/')
    await page.locator('#view-list').waitFor({ state: 'visible' })
    assert.equal(await page.locator('#list .admin-news-card').count(), 2)
    await page.locator('#add').click()
    await page.locator('#view-form').waitFor({ state: 'visible' })
    await page.reload()
    await page.locator('#photo-files').waitFor({ state: 'visible' })
    // 3200x1800のPNGをブラウザ自身で生成。画像デコーダー/Canvasは置換しない。
    const source = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 3200; c.height = 1800
      const ctx = c.getContext('2d'), pixels = ctx.createImageData(c.width, c.height)
      let seed = 12345
      for (let p = 0; p < pixels.data.length; p += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        pixels.data[p] = seed & 255; pixels.data[p + 1] = seed >>> 8 & 255; pixels.data[p + 2] = seed >>> 16 & 255; pixels.data[p + 3] = 255
      }
      ctx.putImageData(pixels, 0, 0)
      // 元画像10MiB制限内に収めるJPEGとPNGの双方を使う。
      return { jpeg: c.toDataURL('image/jpeg', .9).split(',')[1], png: (() => { c.width = 2400; c.height = 1200; ctx.fillStyle = '#298060'; ctx.fillRect(0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1] })() }
    })
    const started = performance.now()
    await page.locator('#photo-files').setInputFiles([
      { name: 'noise.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(source.jpeg, 'base64') },
      { name: 'green.png', mimeType: 'image/png', buffer: Buffer.from(source.png, 'base64') },
    ])
    await page.waitForFunction(() => document.querySelector('#upload-list').textContent.split('未送信').length === 3)
    const encodeMs = Math.round(performance.now() - started)
    const previews = await page.locator('#upload-list img').evaluateAll(imgs => imgs.map(img => ({ width: img.naturalWidth, height: img.naturalHeight, bytes: atob(img.src.split(',')[1]).length })))
    assert.equal(previews.length, 2)
    previews.forEach(p => { assert.equal(p.width, 1600); assert.ok(p.bytes <= 1048576 && p.bytes > 0) })
    assert.equal(gas.files.size, 0)
    await page.locator('#upload-start').click()
    await page.getByRole('button', { name: '再送', exact: true }).waitFor()
    assert.equal(await page.locator('#save').isDisabled(), true)
    await page.getByRole('button', { name: '再送', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('#save').disabled)
    assert.equal(gas.files.size, 2)
    await page.getByRole('button', { name: '前へ', exact: true }).nth(1).click()
    assert.match(await page.locator('#upload-list p').first().textContent(), /green.png/)
    // 未同意なら生成不可。入力と画像を保持して同意後に再実行できる。
    await page.locator('#draft').click()
    await page.locator('#form-error').waitFor({ state: 'visible' })
    await page.locator('#ai-consent').check()
    await page.locator('#draft').click()
    await page.waitForFunction(() => document.querySelector('#f-title').value === '作例の日記')
    await page.locator('#f-body').fill('手直しした本文を保存します。')
    await page.locator('#save').click()
    await page.locator('#view-detail').waitFor({ state: 'visible' })
    await page.reload()
    await page.locator('#view-detail').waitFor({ state: 'visible' })
    assert.equal(await page.locator('#detail-body').textContent(), '手直しした本文を保存します。')
    const post = gas.call('getOne', new URL(page.url()).hash.slice('#post-'.length)).data
    assert.deepEqual(post.images.map(i => gas.run(`AssetRepository.find('${i.file_id}',true).storage_key`)), ['drive-2', 'drive-1'])
    await page.waitForFunction(() => [...document.querySelectorAll('#view-detail img')].filter(i => i.src.startsWith('data:image/jpeg')).length >= 2)
    const images = await page.locator('#view-detail img').evaluateAll(imgs => imgs.map(i => ({ complete: i.complete, width: i.naturalWidth })))
    assert.ok(images.every(i => i.complete && i.width > 0))
    // 未添付だけを整理。既に添付した2枚は候補から外れる。
    gas.call('uploadPhoto', { uploadId: 'orphan-browser-1', mimeType: 'image/png', base64: png })
    gas.run('AssetRepository.list(true).filter(r=>r.storage_kind==="drive").forEach(r=>AssetRepository.update(r.id,{created_at:new Date(Date.now()-48*3600000)}))')
    await page.goto('http://diary.test/#new')
    await page.locator('#upload-panel summary').click()
    await page.locator('#orphan-refresh').click()
    await page.getByRole('button', { name: 'ゴミ箱へ移動', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'ゴミ箱へ移動', exact: true }).count(), 1)
    assert.equal(await page.getByRole('link', { name: 'Driveで画像を確認', exact: true }).getAttribute('href'), 'https://drive.google.com/file/d/drive-3/view')
    await page.getByRole('button', { name: 'ゴミ箱へ移動', exact: true }).click()
    await page.getByRole('button', { name: 'ゴミ箱へ移動', exact: true }).waitFor({ state: 'detached' })
    assert.equal(gas.files.get('drive-3').isTrashed(), true)
    assert.equal(gas.files.get('drive-1').isTrashed(), false)
    assert.equal(gas.files.get('drive-2').isTrashed(), false)
    // 起動HTMLとDOMを50件に抑え、追加ページもPC・スマホ幅で操作できる。
    gas.run(`withLock_(()=>SheetStore.append("posts",Array.from({length:120},(_,i)=>({
      id:"browser-page-"+i,title:"追加ページ"+i,body:"本文",created_at:new Date()
    }))))`)
    await page.goto('http://diary.test/')
    await page.waitForFunction(() => document.querySelectorAll('#list .admin-news-card').length === 50)
    await page.locator('#list-more').click()
    await page.waitForFunction(() => document.querySelectorAll('#list .admin-news-card').length === 100)
    await page.locator('#list-more').click()
    await page.waitForFunction(() => document.querySelectorAll('#list .admin-news-card').length === 123)
    assert.equal(await page.locator('#list-more').isHidden(), true)
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '横スクロールなし')
    results.push({ viewport, encodeMs, previews, uploadRetry: true, reload: true, order: true, orphanUi: true, pagination: true, rpcCalls: calls.length })
    await context.close()
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/browser-acceptance.json', JSON.stringify({ scope: '実Chromium・模擬GAS/Drive/Gemini。スマホ幅はエミュレーション。', results }, null, 2) + '\n')
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
