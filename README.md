# batorowa（ばとろわ）

Phaser 3 で作っているサバイバル風マルチプレイヤーゲームの練習・テスト版リポジトリです。

現在は**テスト版（test.html）**を中心に公開しています。  
F8デバッグビジュアル、音量調整、自分の足音・銃声だけ調整可能、静的NPCでの練習、ルート拾い、マップエディタなどが揃っています。

## 今すぐ試す（おすすめ順）

1. **テスト/練習版**（一番充実）
   - `test.html` を開く
   - 1920×1080、F8で青視界・音円・状態表示フルON、デフォルト
   - 音量UI（Master / Self Foot / Self Gun）あり
   - 左クリック射撃、Space拾得、WASD移動

2. **マップエディタ**
   - `map_editor.html`
   - Wall / Box / Rock / Tree / player_spawn / item_spawn_area を配置・移動・リサイズ
   - Save で正確なJSON出力（後で本番読み込み予定）

3. **開発中の本格ゲーム版**
   - `game.html`（旧 index.html）

## 起動の超重要ポイント

**必ずローカルサーバーを使ってください。**

- 直接HTMLをダブルクリック（file://）すると音声（walk.wav / shoot.wav）が読み込めず固まる・無音になります。
- 推奨コマンド例（このフォルダで実行）:
  ```powershell
  python -m http.server 8000
  # または
  npx serve .
  ```
- ブラウザで `http://localhost:8000/test.html` を開く

GitHub Pages で公開した場合も同じです（音はローカルサーバー推奨）。

## GitHub Pages で公開する方法

1. GitHubで新しいリポジトリを作成（名前例: `batorowa`）
2. このフォルダの内容を push
3. リポジトリの **Settings → Pages** で
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
4. 数分待つと `https://あなたのユーザー名.github.io/batorowa/test.html` で遊べるようになります
5. index.html がこのランディングページになります

## フォルダ構成

```
batorowa-project/
├── index.html          # このランディングページ（GitHub Pagesの入口）
├── test.html           # メインのテスト/練習モード（一番おすすめ）
├── game.html           # 開発中のフルゲーム版（モジュール構成）
├── map_editor.html     # マップ作成ツール（JSON保存対応）
├── js/
│   ├── phaser.min.js
│   ├── main.js / player.js / npc.js / audio.js / combat.js など
│   └── ...
├── assets/
│   ├── sounds/ (walk.wav, shoot.wav)
│   └── images/
│       ├── weapons/ (hg.png, sg.png, ar.png, smg.png, sr.png)
│       └── armor/ (armor1-3.png, goggles.png)
├── data/               # weapons.json, equipment.json など
├── IMPLEMENTATION_STATUS.md
└── .gitignore
```

## 最近追加・調整した主な機能（テスト版）

- 音量調整機能（自分の足音と銃声だけ個別調整 + Master全体）
  - ブラウザの音がうるさい時にすぐ下げられる
  - AIの聞こえる範囲（650/190など）は一切変わらない
- UIを大きく・少し上に配置
- F8デバッグ完全ON初期状態 + F9リスタート
- 静的NPC（練習しやすい） + 等間隔ルート
- 左クリックのみ射撃 + Space拾得に分離
- 実音 + 距離減衰（テスト版は自分用ボリュームオーバーライド）

詳細は `IMPLEMENTATION_STATUS.md` を参照してください。

## 今後の方向（ユーザー意向）

- テスト版でしっかり遊べる状態を優先
- マップエディタで作ったマップを本番（game.html / js/側）に反映予定
- オンライン（8人程度の友人内マルチ）は後回し

## 注意

- 一部画像（headset, medkitなど）はまだプレースホルダー（コードで円や文字にフォールバック）
- 音声ファイルはユーザーが配置した実ファイルを使用（リポジトリに含まれています）
- 外部フォールバックで Phaser公式のダミースプライトを2箇所使用（phaser-dude.png）

何か質問・機能追加希望・バグ報告があればこのリポジトリの Issue や直接どうぞ！

（このREADMEはテスト版公開に合わせて大幅更新）
