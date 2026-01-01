十年一日｜Canva 風格靜態模板（可上線版）
================================================

你得到的資料夾結構：
- index.html               網站主頁（已內嵌 CSS/JS，避免路徑問題）
- data/content.json        可改文字（公告、免運、品牌名、文案）
- data/products.json       可改商品（價格 TWD、描述、Stripe 付款連結）
- admin/index.html         內建簡易編輯器（改完可下載 JSON 覆蓋到 data/）
- README_使用說明.txt       本檔

一、如何用 GitHub Pages 上線（不靠 Netlify）
1) 把整包檔案上傳到你的 repo（tenyears-site）根目錄
2) GitHub Repo → Settings → Pages
3) Source: Deploy from a branch
4) Branch: main / (root)
5) 儲存後等 30~60 秒
6) 網址會是： https://<你的帳號>.github.io/<repo名>/

二、如何改免運活動（你說要能隨時改）
- 打開 data/content.json
- 找到 free_shipping_text
- 改文字 → Commit → 重新整理網站

三、如何接 Stripe（Payment Links）
- 打開 data/products.json
- 每個商品都有 payment_link（留空代表尚未設定）
- 把 Stripe 付款連結貼上去 → Commit
- 網站上「立即購買」會直接跳到你的 Stripe 結帳頁

四、為什麼你的頁面曾經變成純文字？
因為 CSS/JS 路徑沒載入（相對路徑 + 不同 URL path / #hash）
這份模板已經把 CSS/JS 全部內嵌在 index.html 內，最穩。

需要我幫你再更像 Canva（icon 更細、間距、陰影、卡片透明度）也可以直接說。
