// src/lib/i18n.tsx
// ระบบ 3 ภาษา (ไทย / อังกฤษ / ญี่ปุ่น) — วางไฟล์นี้ที่ src/lib/i18n.tsx
// ครอบแอปด้วย <LangProvider> แล้วใช้ useLang() ในแต่ละหน้า
import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { Check } from "lucide-react";

export type Lang = "th" | "en" | "jp";

// ---- Dictionary: UI strings เท่านั้น (ข้อความในตาราง DB ใช้ localized() ด้านล่าง) ----
// key -> คำแปลแต่ละภาษา  (en = ข้อความเดิมในแอป)
const dict: Record<string, Record<Lang, string>> = {
  "greeting.morning":      { en: "GOOD MORNING",       th: "สวัสดีตอนเช้า",        jp: "おはようございます" },
  // bottom nav
  "nav.explore":           { en: "Explore",            th: "สำรวจ",               jp: "さがす" },
  "nav.map":               { en: "Interactive Map",    th: "แผนที่",              jp: "マップ" },
  "nav.collection":        { en: "Stamp Book",         th: "สมุดแสตมป์",          jp: "スタンプ帳" },
  "nav.profile":           { en: "Profile",            th: "โปรไฟล์",             jp: "プロフィール" },
  // sections
  "section.trending":      { en: "Trending Spots",     th: "ร้านมาแรง",           jp: "人気のスポット" },
  "section.recentActivity":{ en: "Recent Activity",    th: "กิจกรรมล่าสุด",       jp: "最近のアクティビティ" },
  "section.reviews":       { en: "Reviews",            th: "รีวิว",               jp: "レビュー" },
  "common.viewAll":        { en: "View All",           th: "ดูทั้งหมด",           jp: "すべて見る" },
  "common.about":          { en: "About",              th: "เกี่ยวกับ",           jp: "詳細" },
  // place detail
  "place.detail":          { en: "Place Detail",       th: "รายละเอียดสถานที่",   jp: "スポット詳細" },
  "place.aboutThisSpot":   { en: "About This Spot",    th: "เกี่ยวกับสถานที่นี้", jp: "このスポットについて" },
  "place.category":        { en: "Category",           th: "ประเภท",              jp: "カテゴリー" },
  "place.description":     { en: "Description",         th: "คำอธิบาย",            jp: "説明" },
  "place.japaneseName":    { en: "Japanese Name",      th: "ชื่อภาษาญี่ปุ่น",     jp: "日本語名" },
  "place.nearMe":          { en: "Near me",            th: "ใกล้ฉัน",             jp: "現在地周辺" },
  "place.noRating":        { en: "No rating",          th: "ยังไม่มีคะแนน",       jp: "評価なし" },
  // actions
  "action.writeReview":    { en: "Write a Review",     th: "เขียนรีวิว",          jp: "レビューを書く" },
  "action.submitSpot":     { en: "Submit a New Spot",  th: "เพิ่มสถานที่ใหม่",    jp: "新しいスポットを登録" },
  "action.signOut":        { en: "Sign Out",           th: "ออกจากระบบ",          jp: "ログアウト" },
  "review.yourRating":     { en: "Your Rating",        th: "คะแนนของคุณ",         jp: "あなたの評価" },
  // collection
  "collection.allRegions": { en: "All Regions",        th: "ทุกภูมิภาค",          jp: "すべての地域" },
  "collection.notCollected":{ en: "NOT COLLECTED",     th: "ยังไม่ได้สะสม",       jp: "未取得" },
  "collection.available":  { en: "Heritage Stamp Available", th: "มีแสตมป์ให้สะสม", jp: "スタンプ取得可能" },
  // profile
  "profile.stamps":        { en: "Stamps",             th: "แสตมป์",              jp: "スタンプ" },
  "profile.places":        { en: "Places",             th: "สถานที่",             jp: "スポット" },
  "profile.reviews":       { en: "Reviews",            th: "รีวิว",               jp: "レビュー" },
  "profile.travelerRank":  { en: "Traveler Rank",      th: "อันดับนักเดินทาง",    jp: "トラベラーランク" },
  "profile.localExpert":   { en: "Local Expert",       th: "ผู้เชี่ยวชาญท้องถิ่น",jp: "ローカルエキスパート" },
  "profile.unlockedBadges":{ en: "Unlocked Badges",    th: "เหรียญที่ปลดล็อก",    jp: "獲得したバッジ" },
  "profile.accountSettings":{ en: "Account Settings",  th: "ตั้งค่าบัญชี",        jp: "アカウント設定" },
  "profile.allActivity":   { en: "All Activity",       th: "กิจกรรมทั้งหมด",      jp: "すべてのアクティビティ" },
  // categories (ระบบ 2 ประเภทตาม feedback ลูกค้า)
  "category.all":          { en: "All",                th: "ทั้งหมด",             jp: "すべて" },
  "category.restaurant":   { en: "Restaurant",         th: "ร้านอาหาร",           jp: "飲食店" },
  "category.souvenir":     { en: "Souvenir Shop",      th: "ร้านของฝาก",          jp: "土産店" },
  // misc
  "demo.access":           { en: "Demo Access",        th: "เข้าถึงเดโม่",        jp: "デモアクセス" },
  // search
  "search.placeholder":    { en: "Search spots, stations...", th: "ค้นหาร้าน สถานี...", jp: "スポット・駅を検索..." },
  // other
  "trending.sub":           { en: "Most visited heritage places this week", th: "ร้านมรดกที่คนไปเยอะสุดสัปดาห์นี้", jp: "今週最も訪れられた老舗スポット" },
  "trending.seeAll":        { en: "See all trending shops →", th: "ดูร้านมาแรงทั้งหมด →",           jp: "人気の店をすべて見る →" },
  "trending.rankedSub":     { en: "Ranked by popularity · updated every 3 days", th: "เรียงตามความนิยม · อัปเดตทุก 3 วัน", jp: "人気順 · 3日ごとに更新" },
  "cat.restaurantCafe":     { en: "Restaurant/Cafe",         th: "ร้านอาหาร/คาเฟ่",              jp: "飲食店・カフェ" },
  "cat.serviceShop":        { en: "Service/Shop",            th: "ร้านค้า/บริการ",               jp: "商店・サービス" },
  "empty.noPlaces":         { en: "No places available yet.", th: "ยังไม่มีร้านในระบบ",            jp: "まだ登録された店がありません" },
  "empty.noResults":        { en: "No results for",          th: "ไม่พบผลลัพธ์สำหรับ",           jp: "見つかりませんでした：" },
  "empty.noTrendingFilter": { en: "No trending spots match this filter.", th: "ไม่มีร้านมาแรงตรงกับตัวกรองนี้", jp: "この条件に合う人気スポットはありません" },
  "common.loadMore":        { en: "Load more",               th: "โหลดเพิ่ม",                    jp: "もっと見る" },
  "filter.all":             { en: "All",                     th: "ทั้งหมด",                      jp: "すべて" },
  "seasonal.title":         { en: "Seasonal Hits",           th: "ฮิตประจำฤดู",                  jp: "季節のおすすめ" },
  "seasonal.sub":           { en: "Sweet & savory picks, refreshed regularly", th: "ของหวาน & ของคาว สลับหมุนเวียน", jp: "甘味・食事の一押し、随時更新" },
  "seasonal.sweet":         { en: "Sweet",                th: "ของหวาน",                   jp: "甘味" },
  "seasonal.savory":        { en: "Savory",               th: "ของคาว",                    jp: "食事" },
  "newstamps.title":        { en: "New Stamps",              th: "แสตมป์เข้าใหม่",               jp: "新着スタンプ" },
  "newstamps.sub":          { en: "Freshly added to the collection", th: "เพิ่งเพิ่มเข้าคอลเลกชัน",     jp: "コレクションに新登場" },
  "card.est":               { en: "Est.",                    th: "ก่อตั้ง",                      jp: "創業" },
  "card.reviews":           { en: "reviews",                 th: "รีวิว",                        jp: "件のレビュー" },
  "region.best":            { en: "{r}'s Best",              th: "สุดยอดของ {r}",                jp: "{r}の逸品" },
  //B
  // ── ExploreView ──
  "explore.promoTitle":     { en: "Recommended / Promotions", th: "แนะนำ / โปรโมชัน",              jp: "おすすめ・特集" },
  "explore.promoSub":       { en: "Curated picks and featured spots", th: "คัดสรรร้านเด่นมาแนะนำ",     jp: "厳選のおすすめスポット" },
  "explore.recentSub":      { en: "Explore check-in activities from the community", th: "ดูกิจกรรมเช็คอินจากชุมชน", jp: "コミュニティのチェックイン活動" },
  "explore.noActivity":     { en: "No activity yet. Be the first to check in or write a review!", th: "ยังไม่มีกิจกรรม มาเป็นคนแรกที่เช็คอินหรือรีวิวสิ!", jp: "まだ活動がありません。最初のチェックインやレビューをどうぞ！" },
  // ── CollectionView ──
  "collection.loading":     { en: "Loading your stamp collection...", th: "กำลังโหลดคอลเลกชันแสตมป์...", jp: "スタンプ帳を読み込み中..." },
  "collection.sub":         { en: "Your Eki-tag style digital collection", th: "คอลเลกชันดิจิทัลสไตล์ Eki-tag ของคุณ", jp: "Eki-tag スタイルのデジタルコレクション" },
  "collection.stampsCollectedSuffix": { en: "Stamps Collected", th: "แสตมป์ที่สะสม",             jp: "個 取得" },
  "collection.collected":   { en: "Collected Stamps",         th: "แสตมป์ที่สะสมแล้ว",            jp: "取得済みスタンプ" },
  "collection.collectedTag":{ en: "COLLECTED",             th: "สะสมแล้ว",                   jp: "取得済み" },
  "collection.remaining":   { en: "Remaining Places",         th: "ที่ยังไม่ได้สะสม",             jp: "未取得のスポット" },
  "collection.noPlacesLater":{ en: "No places available yet. Check back later!", th: "ยังไม่มีร้านในระบบ กลับมาเช็กใหม่ภายหลัง!", jp: "まだ店がありません。また後でご確認ください！" },
  "collection.noMatch":     { en: "No stamps match",          th: "ไม่มีแสตมป์ตรงกับ",            jp: "一致するスタンプがありません：" },
  // ── ProfileView ──
  "profile.editProfile":    { en: "Edit Profile",             th: "แก้ไขโปรไฟล์",                 jp: "プロフィール編集" },
  "profile.badges":         { en: "Badges",                   th: "เหรียญ",                       jp: "バッジ" },
  "profile.level":          { en: "LEVEL",                    th: "เลเวล",                        jp: "レベル" },
  "profile.xpToNext":       { en: "XP to next level",         th: "XP สู่เลเวลถัดไป",             jp: "XP で次のレベル" },
  "profile.signOutSub":     { en: "Disconnect account from this device", th: "ออกจากบัญชีบนอุปกรณ์นี้", jp: "この端末からアカウントを切断" },
  "level.wanderer":         { en: "Wanderer",                 th: "นักเดินทาง",                   jp: "旅人" },
  "level.explorer":         { en: "Explorer",                 th: "นักสำรวจ",                     jp: "探検家" },
  "level.adventurer":       { en: "Adventurer",               th: "นักผจญภัย",                    jp: "冒険家" },
  "level.localExpert":      { en: "Local Expert",             th: "ผู้เชี่ยวชาญท้องถิ่น",        jp: "ローカルエキスパート" },
  "level.heritageMaster":   { en: "Heritage Master",          th: "ปรมาจารย์มรดก",               jp: "ヘリテージマスター" },
  "level.legendary":        { en: "Legendary Traveler",       th: "นักเดินทางในตำนาน",            jp: "伝説の旅人" },
  "badge.tokyo_explorer.label": { en: "Tokyo Explorer",       th: "นักสำรวจโตเกียว",             jp: "東京エクスプローラー" },
  "badge.tokyo_explorer.desc":  { en: "Visited 5 Tokyo spots", th: "เยือน 5 จุดในโตเกียว",        jp: "東京の5スポットを訪問" },
  "badge.quality_reviewer.label": { en: "Quality Reviewer",   th: "นักรีวิวคุณภาพ",              jp: "クオリティレビュアー" },
  "badge.quality_reviewer.desc":  { en: "Left 5 detailed reviews", th: "เขียนรีวิวละเอียด 5 ครั้ง", jp: "詳細なレビューを5件投稿" },
  "badge.secret_badge.label": { en: "Secret Badge",           th: "เหรียญลับ",                    jp: "シークレットバッジ" },
  "badge.secret_badge.desc":  { en: "Locked accomplishment",  th: "ความสำเร็จที่ยังล็อก",        jp: "未解除の実績" },
  "settings.share.label":   { en: "Share Public Profile",     th: "แชร์โปรไฟล์สาธารณะ",          jp: "公開プロフィールを共有" },
  "settings.share.sub":     { en: "Share your stamp books with others", th: "แชร์สมุดแสตมป์ให้คนอื่น", jp: "スタンプ帳を他の人と共有" },
  "settings.help.label":    { en: "Help & Support Center",    th: "ศูนย์ช่วยเหลือ",              jp: "ヘルプ・サポートセンター" },
  "settings.help.sub":      { en: "FAQs, feedback, and user guides", th: "คำถามพบบ่อย ข้อเสนอแนะ และคู่มือ", jp: "FAQ・フィードバック・ガイド" },
  "settings.privacy.label": { en: "Privacy & Data Settings",  th: "ความเป็นส่วนตัวและข้อมูล",     jp: "プライバシー・データ設定" },
  "settings.privacy.sub":   { en: "Manage location permissions and history", th: "จัดการสิทธิ์ตำแหน่งและประวัติ", jp: "位置情報の権限と履歴を管理" },
  // ── MapView ──
  "map.loading":            { en: "Loading Japan Heritage Database...", th: "กำลังโหลดฐานข้อมูลมรดกญี่ปุ่น...", jp: "日本遺産データベースを読み込み中..." },
  "map.sub":                { en: "Explore historical Japanese shops and landmarks", th: "สำรวจร้านเก่าแก่และแลนด์มาร์กของญี่ปุ่น", jp: "日本の老舗と名所を探索" },
  "map.noDesc":             { en: "No description available for this historical shop.", th: "ยังไม่มีคำอธิบายสำหรับร้านนี้", jp: "この老舗の説明はまだありません" },
  "map.address":            { en: "Address:",                 th: "ที่อยู่:",                     jp: "住所：" },
  "map.viewDetails":        { en: "View Details & Write Review", th: "ดูรายละเอียด & เขียนรีวิว",  jp: "詳細を見る・レビューを書く" },
  "map.zoomTo":             { en: "Zoom To Location",         th: "ซูมไปที่ตำแหน่ง",             jp: "現在地にズーム" },
  "map.visitWebsite":       { en: "Visit Website",            th: "เยี่ยมชมเว็บไซต์",            jp: "ウェブサイトを見る" },
  "map.noMatch":            { en: "No places match this filter and search combination.", th: "ไม่มีร้านตรงกับตัวกรองและคำค้นนี้", jp: "この条件に合う店がありません" },
  // ── ทั่วไป ──
  "common.submitting":      { en: "Submitting...",           th: "กำลังส่ง...",                  jp: "送信中..." },
  "common.loading":         { en: "Loading...",              th: "กำลังโหลด...",                 jp: "読み込み中..." },
  // ── PlaceDetail (Modals) ──
  "place.navigate":         { en: "Navigate",                th: "นำทาง",                        jp: "経路案内" },
  "place.checkinHere":      { en: "Check-in Here",           th: "เช็คอินที่นี่",               jp: "ここでチェックイン" },
  "place.stampCollected":   { en: "Stamp Collected",         th: "เก็บแสตมป์แล้ว",              jp: "スタンプ取得済み" },
  "place.stampGot":         { en: "You have collected this stamp!", th: "คุณเก็บแสตมป์นี้แล้ว!",  jp: "このスタンプを取得しました！" },
  "place.checkinHint":      { en: "Check in at this location to collect the digital stamp book seal.", th: "เช็คอินที่นี่เพื่อรับตราแสตมป์ดิจิทัล", jp: "この場所でチェックインしてデジタルスタンプを獲得しましょう。" },
  "place.visitOfficial":    { en: "Visit Official Website",  th: "เยี่ยมชมเว็บไซต์ทางการ",       jp: "公式サイトを見る" },
  "reviews.none":           { en: "No reviews",              th: "ยังไม่มีรีวิว",               jp: "レビューなし" },
  "reviews.loading":        { en: "Loading reviews...",      th: "กำลังโหลดรีวิว...",           jp: "レビューを読み込み中..." },
  "reviews.user":           { en: "User",                    th: "ผู้ใช้",                       jp: "ユーザー" },
  "reviews.beFirst":        { en: "No reviews yet. Be the first to review this place!", th: "ยังไม่มีรีวิว มาเป็นคนแรกที่รีวิวร้านนี้!", jp: "まだレビューがありません。最初のレビューをどうぞ！" },
  // ── Check-in alerts ──
  "alert.noCoords":         { en: "This shop has no location data yet, so check-in isn't available.", th: "ร้านนี้ยังไม่มีข้อมูลพิกัด ไม่สามารถเช็คอินได้", jp: "この店舗には位置情報がないため、チェックインできません。" },
  "alert.noGeo":            { en: "Your browser doesn't support location services.", th: "เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง", jp: "お使いのブラウザは位置情報に対応していません。" },
  "alert.tooFar":           { en: "You are {d} away. You must be within {r} m to check in.", th: "คุณอยู่ห่างจากร้าน {d} ต้องอยู่ในระยะ {r} m ถึงจะเช็คอินได้", jp: "店舗から {d} 離れています。チェックインには {r} m 以内に近づいてください。" },
  "alert.checkinOk":        { en: "Checked in at {shop}! (You were {d} away)", th: "เช็คอินสำเร็จที่ {shop}! (คุณอยู่ห่างร้าน {d})", jp: "{shop} にチェックインしました！（店舗から {d}）" },
  "alert.permDenied":       { en: "Please allow location access to check in.", th: "กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อเช็คอิน", jp: "チェックインには位置情報の許可が必要です。" },
  "alert.locFail":          { en: "Couldn't get your location. Please try again.", th: "ไม่สามารถดึงตำแหน่งของคุณได้ กรุณาลองใหม่", jp: "位置情報を取得できませんでした。もう一度お試しください。" },
  // ── ReviewForm ──
  "review.optional":        { en: "Your Review (optional)",  th: "รีวิวของคุณ (ไม่บังคับ)",     jp: "レビュー（任意）" },
  "review.placeholder":     { en: "Share your experience...", th: "แชร์ประสบการณ์ของคุณ...",    jp: "感想を書いてください..." },
  "review.submit":          { en: "Submit Review",           th: "ส่งรีวิว",                     jp: "レビューを送信" },
  "review.submitFail":      { en: "Failed to submit review", th: "ส่งรีวิวไม่สำเร็จ",            jp: "レビューの送信に失敗しました" },
  // ── AddPlace ──
  "add.nameEn":             { en: "Spot Name (English)",     th: "ชื่อสถานที่ (อังกฤษ)",        jp: "スポット名（英語）" },
  "add.namePlaceholder":    { en: "e.g. Tokyo Station Red Brick", th: "เช่น Tokyo Station Red Brick", jp: "例：東京駅 赤レンガ" },
  "add.descPlaceholder":    { en: "Tell travelers why this place is special...", th: "บอกนักท่องเที่ยวว่าทำไมที่นี่พิเศษ...", jp: "この場所の魅力を伝えてください..." },
  "add.photo":              { en: "Photo",                   th: "รูปภาพ",                       jp: "写真" },
  "add.tapPhoto":           { en: "Tap to add a photo",      th: "แตะเพื่อเพิ่มรูป",            jp: "タップして写真を追加" },
  "add.errPhoto":           { en: "Please add a photo of the location.", th: "กรุณาเพิ่มรูปของสถานที่", jp: "場所の写真を追加してください。" },
  "add.locating":           { en: "Getting your location...", th: "กำลังดึงตำแหน่ง...",          jp: "位置情報を取得中..." },
  "add.pinned":             { en: "Location pinned ({lat}, {lng})", th: "ปักตำแหน่งแล้ว ({lat}, {lng})", jp: "位置を設定しました（{lat}, {lng}）" },
  "add.pinGps":             { en: "Pin Current GPS Location", th: "ปักตำแหน่ง GPS ปัจจุบัน",     jp: "現在のGPS位置を設定" },
  "add.noGeo":              { en: "Your browser doesn't support location services.", th: "เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง", jp: "お使いのブラウザは位置情報に対応していません。" },
  "add.permDenied":         { en: "Location permission denied. Please allow access and try again.", th: "ปฏิเสธสิทธิ์ตำแหน่ง กรุณาอนุญาตแล้วลองใหม่", jp: "位置情報が拒否されました。許可して再度お試しください。" },
  "add.locFail":            { en: "Could not get your location. Please try again.", th: "ไม่สามารถดึงตำแหน่งได้ กรุณาลองใหม่", jp: "位置情報を取得できませんでした。もう一度お試しください。" },
  "add.uploading":          { en: "Uploading photo...",      th: "กำลังอัปโหลดรูป...",          jp: "写真をアップロード中..." },
  "add.submitVerify":       { en: "Submit for Verification", th: "ส่งเพื่อตรวจสอบ",             jp: "確認のため送信" },
  "add.mustSignIn":         { en: "You must be signed in to submit a place.", th: "ต้องเข้าสู่ระบบก่อนจึงจะส่งสถานที่ได้", jp: "スポットを登録するにはログインが必要です。" },
  "add.uploadFail":         { en: "Failed to upload photo. Please try again.", th: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่", jp: "写真のアップロードに失敗しました。もう一度お試しください。" },
  "add.thankYou":           { en: "Thank you! Your submission is pending review by our team.", th: "ขอบคุณ! การส่งของคุณกำลังรอทีมงานตรวจสอบ", jp: "ありがとうございます！投稿はチームの確認待ちです。" },
  "add.submitFail":         { en: "Failed to submit spot. Please try again.", th: "ส่งสถานที่ไม่สำเร็จ กรุณาลองใหม่", jp: "スポットの送信に失敗しました。もう一度お試しください。" },
  // ── PasswordGate ──
  "gate.sub":               { en: "Enter the demo password to continue", th: "ใส่รหัสผ่านเดโม่เพื่อดำเนินการต่อ", jp: "続行するにはデモパスワードを入力してください" },
  "gate.password":          { en: "Password",                th: "รหัสผ่าน",                     jp: "パスワード" },
  "gate.wrong":             { en: "Incorrect password, try again.", th: "รหัสผ่านไม่ถูกต้อง ลองใหม่", jp: "パスワードが正しくありません。" },
  "gate.enter":             { en: "Enter",                   th: "เข้าสู่ระบบ",                  jp: "入る" },
  // ── AuthView ──
  "auth.sub":               { en: "Sign in to manage your digital stamp book", th: "เข้าสู่ระบบเพื่อจัดการสมุดแสตมป์ดิจิทัล", jp: "デジタルスタンプ帳を管理するにはサインイン" },
  "auth.connecting":        { en: "Connecting...",           th: "กำลังเชื่อมต่อ...",           jp: "接続中..." },
  "auth.tip":               { en: "Sign up to securely sync and backup your collected stamp books.", th: "สมัครเพื่อซิงค์และสำรองสมุดแสตมป์อย่างปลอดภัย", jp: "登録すると、集めたスタンプ帳を安全に同期・バックアップできます。" },
  "auth.loginTab":          { en: "Log In",                  th: "เข้าสู่ระบบ",                  jp: "ログイン" },
  "auth.userSignupTab":     { en: "General User Signup",     th: "สมัครสมาชิกทั่วไป",            jp: "一般会員登録" },
  "auth.merchantSignupTab": { en: "Merchant Partner Signup",th: "สมัครสำหรับเจ้าของร้าน",        jp: "加盟店・店舗登録" },
  "auth.loginTitle":        { en: "Welcome Back to CheckInJapan", th: "เข้าสู่ระบบ CheckInJapan", jp: "CheckInJapanへログイン" },
  "auth.userSignupTitle":   { en: "Create Traveler Account", th: "สมัครสมาชิกผู้ใช้งานทั่วไป",   jp: "旅行者アカウント作成" },
  "auth.merchantSignupTitle":{ en: "Merchant Partner Registration", th: "สมัครสมาชิกสำหรับเจ้าของร้านค้า", jp: "店舗オーナー登録" },
  "auth.merchantSub":       { en: "Register to manage your shop, accept digital stamps, and access merchant analytics.", th: "ลงทะเบียนเพื่อเข้าใช้งานระบบจัดการร้านค้า เสนอร้านขึ้นระบบ และรับการรับรองดิจิทัลสแตมป์", jp: "店舗を管理し、デジタルスタンプと店舗ダッシュボードを利用するために登録します。" },
  "auth.email":             { en: "Email Address",           th: "อีเมล",                       jp: "メールアドレス" },
  "auth.password":          { en: "Password",                th: "รหัสผ่าน",                     jp: "パスワード" },
  "auth.confirmPassword":   { en: "Confirm Password",        th: "ยืนยันรหัสผ่าน",               jp: "パスワード再入力" },
  "auth.passwordRuleTitle": { en: "Password requirements:", th: "เงื่อนไขรหัสผ่าน:", jp: "パスワード要件:" },
  "auth.ruleMinLength":     { en: "8+ chars", th: "8+ ตัวอักษร", jp: "8文字以上" },
  "auth.ruleLowercase":     { en: "a-z", th: "ตัวพิมพ์เล็ก (a-z)", jp: "英小文字 (a-z)" },
  "auth.ruleUppercase":     { en: "A-Z", th: "ตัวพิมพ์ใหญ่ (A-Z)", jp: "英大文字 (A-Z)" },
  "auth.ruleNumber":        { en: "0-9", th: "ตัวเลข (0-9)", jp: "数字 (0-9)" },
  "auth.ruleSpecial":       { en: "Special (!@#$)", th: "สัญลักษณ์ (!@#$)", jp: "記号 (!@#$)" },
  "auth.passwordStrength":  { en: "Password Strength", th: "ระดับความปลอดภัย", jp: "パスワード強度" },
  "auth.passwordInvalidMsg":{ en: "Password does not meet all security requirements. Please check all 5 criteria.", th: "รหัสผ่านไม่ผ่านเงื่อนไขความปลอดภัย กรุณาตั้งรหัสผ่านให้ครบทั้ง 5 เงื่อนไข", jp: "パスワードがすべてのセキュリティ要件を満たしていません。5つの項目をすべて満たしてください。" },
  "auth.displayName":       { en: "Display Name / Full Name",th: "ชื่อ-นามสกุล / ชื่อแสดงผล",    jp: "表示名 / 氏名" },
  "auth.shopName":          { en: "Shop / Store Name",       th: "ชื่อร้านค้า / สถานประกอบการ", jp: "店舗名 / 屋号" },
  "auth.contactName":       { en: "Contact / Owner Name",    th: "ชื่อผู้ติดต่องาน / เจ้าของร้าน", jp: "担当者 / オーナー名" },
  "auth.phone":             { en: "Contact Phone Number",    th: "เบอร์โทรศัพท์ติดต่อ",         jp: "電話番号" },
  "auth.category":          { en: "Shop Category",           th: "หมวดหมู่ร้านค้า",              jp: "店舗カテゴリー" },
  "auth.prefecture":         { en: "Prefecture / Region",     th: "จังหวัดที่ตั้งร้าน",             jp: "都道府県 / 地域" },
  "auth.submitLogin":       { en: "Log In",                  th: "เข้าสู่ระบบ",                  jp: "ログイン" },
  "auth.submitUserSignup":  { en: "Create Account",          th: "สมัครสมาชิก",                  jp: "アカウント作成" },
  "auth.submitMerchantSignup":{ en: "Register Merchant Account", th: "ลงทะเบียนเจ้าของร้านค้า",   jp: "店舗アカウント登録" },
  "auth.hasAccount":        { en: "Already have an account?",th: "มีบัญชีอยู่แล้ว?",               jp: "すでにアカウントをお持ちですか？" },
  "auth.noAccount":         { en: "Don't have an account?",  th: "ยังไม่มีบัญชี?",               jp: "アカウントをお持ちでないですか？" },
  "auth.merchantInvite":    { en: "Are you a store owner?",  th: "คุณเป็นเจ้าของร้านค้า?",        jp: "店舗のオーナー様ですか？" },
  "auth.generalUserInvite": { en: "Want to sign up as a regular traveler?", th: "ต้องการสมัครเป็นผู้ใช้ทั่วไป?", jp: "一般旅行者として登録しますか？" },
  // ── ActivityFeed / ActivityCard ──
  "feed.noActivity":        { en: "No activity yet.",        th: "ยังไม่มีกิจกรรม",             jp: "まだ活動がありません。" },
  "activity.checkin":       { en: "checked in at {shop}",    th: "เช็คอินที่ {shop}",           jp: "{shop} にチェックイン" },
  "activity.review":        { en: "reviewed {shop}",         th: "รีวิว {shop}",                jp: "{shop} をレビュー" },
  "activity.badge":         { en: "unlocked {badge} badge",  th: "ปลดล็อกเหรียญ {badge}",       jp: "{badge} バッジを獲得" },
  "activity.aPlace":        { en: "a place",                 th: "ร้านหนึ่ง",                    jp: "ある店舗" },
  // ── Achievement / Stamp celebration popup ──
  "celebration.stampLabel":       { en: "Stamp Collected", th: "เก็บแสตมป์สำเร็จ", jp: "スタンプ獲得" },
  "celebration.stampTitle":       { en: "Nice! You got a new stamp 🎉", th: "เยี่ยม! ได้แสตมป์ใหม่แล้ว 🎉", jp: "やった！新しいスタンプをゲット 🎉" },
  "celebration.stampDesc":        { en: "You checked in at {shop}. Keep collecting!", th: "คุณเช็คอินที่ {shop} เรียบร้อยแล้ว เก็บต่อไปเรื่อยๆ นะ!", jp: "{shop} にチェックインしました。この調子で集めよう！" },
  "celebration.achievementLabel": { en: "Achievement Unlocked", th: "ปลดล็อกความสำเร็จใหม่", jp: "実績を解除しました" },
  "celebration.next":             { en: "Next", th: "ถัดไป", jp: "次へ" },
  "celebration.awesome":          { en: "Awesome!", th: "เยี่ยมไปเลย!", jp: "やった！" },
  // ── Campaign banner (Explore page) ──
  "campaign.sectionTitle": { en: "Campaigns & Rewards", th: "แคมเปญและของรางวัล", jp: "キャンペーン＆特典" },
  "campaign.sectionSub":   { en: "Join in, complete missions, win prizes", th: "เข้าร่วมกิจกรรม ทำภารกิจ ลุ้นรับของรางวัล", jp: "参加してミッションを達成し、賞品をゲットしよう" },
  "campaign.slide1Tag":    { en: "Monthly Mission", th: "ภารกิจประจำเดือน", jp: "月間ミッション" },
  "campaign.slide1Title":  { en: "Stamp Hunt Challenge", th: "ภารกิจล่าแสตมป์ประจำเดือน", jp: "スタンプハントチャレンジ" },
  "campaign.slide1Desc":   { en: "Collect 5 stamps this month for a bonus badge + partner-shop gift.", th: "เก็บแสตมป์ให้ครบ 5 ดวงภายในเดือนนี้ รับเหรียญพิเศษ + ของที่ระลึกจากร้านค้าพันธมิตร", jp: "今月中にスタンプを5個集めると、限定バッジ＋提携店舗の記念品がもらえます。" },
  "campaign.slide1Cta":    { en: "Start collecting", th: "เริ่มเก็บแสตมป์", jp: "スタンプを集める" },
  "campaign.slide2Tag":    { en: "Photo Contest", th: "ประกวดรีวิว", jp: "フォトコンテスト" },
  "campaign.slide2Title":  { en: "Best Review Contest", th: "ประกวดรีวิวสุดปัง", jp: "ベストレビューコンテスト" },
  "campaign.slide2Desc":   { en: "Write a review with photos for a chance to win weekly shop discounts.", th: "เขียนรีวิวพร้อมรูปสวยๆ ลุ้นรับส่วนลดร้านค้า/ของรางวัลประจำสัปดาห์", jp: "写真付きレビューを投稿して、週替わりの店舗割引をゲットするチャンス！" },
  "campaign.slide2Cta":    { en: "Write a review", th: "เขียนรีวิวเลย", jp: "レビューを書く" },
  "campaign.slide3Tag":    { en: "Invite Friends", th: "ชวนเพื่อน", jp: "友達を招待" },
  "campaign.slide3Title":  { en: "Invite & Earn XP", th: "ชวนเพื่อนแลก XP", jp: "招待してXPをゲット" },
  "campaign.slide3Desc":   { en: "Share your profile link — you and your friend both get bonus XP.", th: "แชร์ลิงก์โปรไฟล์ชวนเพื่อนมาสมัคร รับ XP โบนัสทั้งสองฝ่าย", jp: "プロフィールリンクをシェアすると、あなたも友達もボーナスXPがもらえます。" },
  "campaign.slide3Cta":    { en: "Invite a friend", th: "ชวนเพื่อนเลย", jp: "友達を招待する" },
};

interface LangCtxType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}
const LangCtx = createContext<LangCtxType>({
  lang: "th",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("th"); // ค่าเริ่มต้น: ไทย (เปลี่ยนได้)
  const t = (key: string) => dict[key]?.[lang] ?? dict[key]?.en ?? key; // ไม่มี key -> คืน en หรือ key เดิม ไม่พังจอ
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

// ---- ตัวเลือกคอลัมน์ข้อความจาก DB ตามภาษา ----
// ใช้กับ shop.description / shop.shop_name ฯลฯ ที่มีคู่ _jp (_th ในอนาคต)
// en = ใช้คอลัมน์ต้นฉบับ (อังกฤษ) | jp = description_jp | ถ้าคอลัมน์ว่าง fallback เป็นต้นฉบับ
export function localized<T extends Record<string, any>>(
  row: T | null | undefined,
  field: string,
  lang: Lang
): string {
  if (!row) return "";
  let val = "";
  if (lang === "en") val = row[field] ?? "";
  else {
    const v = row[`${field}_${lang}`];
    val = v && String(v).trim() ? v : (row[field] ?? "");
  }
  return String(val)
    .replace(/\[SCHEDULE:.*?\]/g, "")
    .replace(/\[RULES:.*?\]/g, "")
    .replace(/\[STAMP:.*?\]/g, "")
    .replace(/,?"holidays":\[.*?\],?"is_closed_today":.*?\}/g, "")
    .replace(/,?"holidays":\[.*?\}/g, "")
    .replace(/\{"open_time":.*?\}/g, "")
    .replace(/\[RULES:.*?$/g, "")
    .replace(/\[SCHEDULE:.*?$/g, "")
    .trim();
}

// ---- ปุ่มสลับภาษา (วางบน header ข้างค้นหา/กระดิ่ง) ----
export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  const options: { code: Lang; label: string }[] = [
    { code: "th", label: "ไทย" },
    { code: "en", label: "English" },
    { code: "jp", label: "日本語" },
  ];
  const current = options.find((o) => o.code === lang)!;

  // กดข้างนอก dropdown แล้วปิด
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* ปุ่มหลัก */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-full border"
        style={{ borderColor: "#E3D5C6", color: "#E0533C" }}
        aria-label="Switch language"
      >
        {current.label}
        <span style={{ fontSize: "8px", opacity: 0.7 }}>▼</span>
      </button>

      {/* เมนูที่กางลงมา */}
      {open && (
        <div
          className="absolute right-0 mt-1 py-1 rounded-xl border bg-white shadow-lg z-50"
          style={{ borderColor: "#E3D5C6", minWidth: "120px" }}
        >
          {options.map((o) => (
            <button
              key={o.code}
              onClick={() => { setLang(o.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:bg-stone-50 transition text-left"
              style={{ color: o.code === lang ? "#E0533C" : "#231C18" }}
            >
              {o.label}
              {o.code === lang && <Check size={12} className="text-[#E0533C]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
