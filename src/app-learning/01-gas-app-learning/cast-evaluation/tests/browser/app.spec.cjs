const {test,expect}=require('@playwright/test');
async function ready(page){await expect(page.locator('#status')).not.toHaveText('処理しています…');await expect(page.locator('#status')).not.toHaveText('読み込んでいます…');}
async function screenshot(page,testInfo,name){await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(name+'.png'),fullPage:true});}

test('メンバー・実績のCreate Read、再表示、重複エラーとPC/スマホ',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await ready(page);
 const name='体験 '+testInfo.project.name;await page.locator('#name').fill(name);await page.getByRole('button',{name:'メンバーを追加する',exact:true}).click();await expect(page.locator('#status')).toContainText('メンバーを追加しました');
 await page.locator('#date').fill('2026-10-02');await page.locator('[name=drinks]').fill('2');await page.locator('[name=bottles]').fill('1');await page.locator('[name=sales]').fill('12000');
 await page.getByRole('button',{name:'実績を保存する',exact:true}).click();await expect(page.locator('#status')).toContainText('実績を保存しました');await expect(page.locator('#scores').filter({hasText:name})).toContainText('5.00 pt');
 await page.getByRole('button',{name:'実績を保存する',exact:true}).click();await expect(page.locator('#status')).toContainText('登録済み');await expect(page.locator('[name=drinks]')).toHaveValue('2');
 await page.reload();await ready(page);await page.locator('#month').fill('2026-10');await page.getByRole('button',{name:'結果を見る',exact:true}).click();await ready(page);await expect(page.locator('#scores')).toContainText(name);
 await page.getByText('この月の入力済み実績',{exact:true}).click();await expect(page.locator('#records')).toContainText('12,000 円');await screenshot(page,testInfo,'evaluation');expect(errors).toEqual([]);
});
