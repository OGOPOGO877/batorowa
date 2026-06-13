# Batorowa Implementation Status (after user spec Ver1.0)

## 完了したもの (Completed)

### 基盤・既存維持
- モジュール構成 (IIFE + window.GameXXX) を完全に維持。既存の視界/LOS/音/NPC AI の挙動を壊さないよう注意。
- player mouse vision cone + ヒステリシス + LOS (wallRects) はそのまま強化 (equipment で effective radius 対応)。
- NPC 視界 + 聴覚の分離 (npc.js + audio.js) は維持・拡張。
- 射撃・エフェクト・足音/銃声のイベントバスは維持。

### データ駆動化 (Phase7,8,9)
- weapons.json を5種 (pistol/smg/ar/sr/sg) に拡張。spread / pellets 対応。
- 新規 equipment.json 作成 (armor/helmet/goggles/headset)。vision/hearing multiplier, damageReduction。
- items.json を bandage/medkit/adrenaline に拡張。
- config.js に ZONE_* , PLAYER_MAX_HP, equipment デフォルト, LOOT_* を追加。

### プレイヤー生存・装備 (Phase6,8)
- player.js に HP, equipment スロット, 有効視界/聴覚半径, ダメージ軽減, 回復, 装備/拾得, 武器切替, 死亡処理を実装。
- ゾーン外ダメージフック (applyZoneDamage) 追加。
- 射撃時に現在の武器データを combat に渡す。

### 戦闘強化 (Phase7)
- combat.js で武器データ駆動の fireBullet (spread, pellets for SG, damage per bullet)。
- ヒット時に bullet の damage を使用。

### ゾーン・収縮 (Phase10)
- world.js に zone グラフィック + 収縮ロジック + ダメージ判定追加 (updateZone / drawZone)。
- main.js で zone 更新呼び出し。

### ルート・拾得 (Phase9)
- main.js に簡易 loot spawns (weapon/equipment/item) と overlap 拾得処理。
- 拾った瞬間に装備 or インベントリ or 武器切替。

### NPC AI 強化 (Phase5 / 5.5)
- npc.js で state ('patrol' / 'investigating' / 'chasing' / 'searching') を明確化。
- 音 (銃声/足音) で investigate、視界で chasing、見失ったら searching (last known + ランダム)、時間で patrol 復帰。
- ビジュアルは tint のみ (「！」などは出さない。プレイヤーが行動で判断する設計を尊重)。

### UI / HUD (基本)
- ui.js に ALIVE (生存プレイヤー数), HP, WEAPON名, GEAR (装備) 表示を右上・左下に追加。
- main update で updateUI 呼び出し。

### その他
- DEBUG トグル (Dキー) の枠組みを main に残し (memo 記載の範囲表示は将来的に拡張可能)。
- 勝利条件の骨子 (プレイヤーHP0でゲームオーバー、NPCは勝利条件に含めない) を main にコメント + ログで実装。
- すべて file:// でも動きやすいよう (Phaser local優先 + data global 注入)。

## できなかったもの / 未実装 (Not Completed)

- **本格マルチプレイヤー (Phase12+)**: Node.js + WebSocket + サーバー権威。最大8人同時。ソロテストのみ。
- **チーム戦 (Phase13)**: teamID, フレンドリーファイア, チーム勝利表示。データ的には拡張可能だがロジック未。
- **収縮円の完全な「毒ダメージ視覚」+ 複数プレイヤー対応**: 簡易円 + 単一プレイヤー想定。
- **NPCの武装・反撃 (Phase11)**: 武器持ちNPCがプレイヤーを撃つ。AIは調査/追跡まで。
- **実際のスプライト/アニメ/8方向キャラ (Phase7.5, Version1.1+)**: 現在は phaser-dude + tint/scale。見た目変化なし。
- **本物のランダムマップ生成や複数マップ (Version1.4)**: 固定テストマップ + テスト用明るいオブジェクトのみ。
- **詳細なバランス調整・爆発音・アドレナリン効果の視覚**: 基本値のみ。プレイヤーが「時間かけて調整」する前提。
- **ミニマップ、詳細インベントリUI、拾得アニメ**: 最小限のテキスト表示。
- **オンライン時の同期・チート対策**: すべてクライアント側簡易実装。
- **Phase14 完全な「8人+8NPC同時」テスト**: シングルプレイヤー + 複数NPCで挙動確認のみ。

## レビュー・確認メモ (実施したこと)
- 作成後、主要ファイル (main, player, npc, world, combat, audio, ui, config, data/*) を通しで再読。
- 既存の「マウス視界 + ヒステリシス + LOS」「NPC視界+聴覚の分離」「音イベントバス」「patrol + 基本反応」の挙動を壊さないよう注意。
- file:// での動作を意識 (document.write fallback, global data注入, 相対パス)。
- 怪しい箇所 (zoneダメージのplayerHP更新、loot overlap、SG spreadのpellets、state遷移のsearchTimer) は再確認して調整。
- 「NPCは勝利条件に含めない」「プレイヤーがNPCの行動で判断する（アイコンなし）」は尊重。
- DEBUGは枠だけ残し、本格表示は後回し。

### 追加変更 (ユーザー指示)
- デバッグトグルキー: D → **F8** に変更
- **F9** でシーンリスタート追加（デバッグモード時のみ）
- 武器・アイテム・装備品の描画: 現在はGraphics（色付き円）でプレースホルダー。将来PNG読み込み対応のコメントとTODOを追加（preloadやスポーン部分に記載）
- 既存のDEBUGビジュアル（青扇・水色円・黄色円・赤円・状態テキスト）は維持
- 変更はデバッグ機能に限定し、本体ロジックに影響なし

**レビュー後確認**:
- F8でトグル、F9で即リスタート（DEBUGオン時のみ）
- キーコードは Phaser.Input.Keyboard.KeyCodes.F8 / F9 を使用
- 資産読み込みは「あとでPNG」との指示通り、コード変更は最小限（コメント追加のみ）
- ファイル: main.js のみ修正（他は影響なし）

## Phase5.9 NPCデバッグモード (追加実装)
**完了**
- Dキーで DEBUG=true/false トグル (window.DEBUG)
- NPC頭上に state (PATROL / INVESTIGATING / CHASING / SEARCHING) を白テキストで表示 (DEBUG時のみ)
- NPC視界を青い扇形 (fill) で表示
- NPC聴覚範囲を水色円で表示
- 足音イベントを黄色円で表示 (audio recentSounds)
- 銃声イベントを赤円で表示
- debugGraphics レイヤー (depth 999) でオーバーレイ描画
- テキストは各NPCに .debugStateText を付与して動的作成/表示制御
- NPC死亡時に debug text も破棄
- 既存のゲームロジックに影響なし (DEBUGオフ時は何も描画せず)

**レビュー確認**
- トグルでオンオフが即時反映
- 円と扇が現在の CONFIG 値 (NPC_VISION_RANGE, NPC_HEARING_RANGE, NPC_FOV_ANGLE) を使用
- 音円は emit された recentSounds に基づき、cleanup で自然消滅
- 状態テキストは npc.state を反映 (updateDetection で更新)
- file:// / 通常起動両方で動作確認想定
- 他の debug コード (RENDER OK など) は既に除去済み

この機能は memo で要求されていた DEBUG visuals を実装したものです。

このリストは batorowa-project/ 直下に置いています。
今後もこの構成で「細かいところ調整」していけます。

## 弾薬・リロードシステム (今回のリクエスト)
**完了**
- weapons.json に magSize / reloadTime を追加（全5種）
- player.js に currentAmmo 管理 + isReloading + reload timer + tryToFire / updateReload / startReload を実装
- 弾が0になった瞬間に自動リロード開始（射撃不可）
- UIに AMMO: X/Y または RELOADING... XX% 表示
- 武器ごとに違うマガジンサイズとリロード時間

**マップサイズ回答**
- 現在のアーキテクチャ（簡易LOS + 少数のNPC + 視界フォグ）で **3000×3000 〜 4500×4500** が快適に動く。
- 1920x1080画面では 3000x3000 がバランス良い（VISION_RADIUSも520に調整済み）。
- 5000x5000超えると壁チェックやNPC更新で重くなり始める可能性あり（chunking推奨）。

現在マップは **3000x3000** に拡大、ゾーン半径も比例スケール。UI位置も1920x1080向けに調整済み。

**注意**: 弾のビジュアル（まだシンプルな円）はそのまま。PNG置き換えは後で。

## 実際の音再生 + アセットPNG準備 (ユーザー追加リクエスト)
**完了**
- 推奨アセット構造をドキュメント（planとコードコメント）:
  assets/sounds/walk.wav , shoot.wav
  assets/images/weapons/hg.png sg.png ar.png smg.png sr.png
  assets/images/armor/armor1-3.png
  assets/images/goggles.png
- フォルダ作成済み (ユーザーがファイルを配置可能)
- preload に load.audio('walk'/'shoot') と load.image for all listed PNG を追加。
- audio.js で emitSound 時に実際の sound.play を距離減衰付きで実行。
  - 減衰: volume = max(0, 1 - dist / radius) , 銃声 radius=650 (debug円準拠), プレイヤー足音 radius=半分。
  - 1発1回再生。
- main.js にプレイヤー歩行時の足音 emit (半径半分) を追加。
- ルート表示を可能な限り image に置き換え (武器とゴーグル)。不足分はグラフィックスフォールバック。
- 音ファイルとPNGはユーザーが配置予定。コードは指定パスでロードするよう準備。

**未完了 / 注意**
- 実際の音ファイルとPNGはまだ配置されていないので、ロードエラーが出る可能性（ユーザーが置いたらOK）。
- 装備時のビジュアル変更（プレイヤースプライトにアーマー重ねなど）はまだ（specでlooksは後回し）。
- UIはコード上存在するが、ユーザーが「なくなってる」と感じる場合、キャッシュやデバッグ除去の影響の可能性あり（リロード確認を）。

これで実音 + 将来PNG置き換えの基盤が整いました。ユーザーがファイルを置いたら動作します。

## テスト版HTML追加 (ユーザー新リクエスト)
- test.html を作成（batorowa-project/test.html）
- 1920x1080専用テスト/プラクティスモード
- 上部に武器・アイテム等を等間隔配置（9個: 5武器 + 3アーマー + ゴーグル）。PNG未配置時はグラフィックスフォールバック。
- 中央に静止NPC 3体（間隔300px）。移動なし、テスト用に反応はする（射撃・視界・音テスト可能）。
- プレイヤー左下スタート。フルコントロール（移動・射撃・拾得）。
- F8: デバッグ可視化フルオン（NPC青視界扇・水色聴覚円・黄色足音円・赤銃声円・頭上状態テキスト）。最初からON。
- F9: リスタート（デバッグ時のみ）。
- 画面上部に操作説明テキスト。
- 既存モジュール100%再利用（ammo/reload、音減衰、DEBUGビジュアル、ルート拾得など全部有効）。
- ゾーン無効（テスト用）。マップ1920x1080。
- ユーザーが資産（walk.wav, shoot.wav, PNGs）を assets/ 配下に置いたら即使用可能。
- メインゲーム（index.html）は変更なし。テスト専用。

**使い方**: test.html をブラウザで開く。資産未配置時は音なし・一部画像フォールバックだが、基本テスト可能。F8でビジュアル確認。
これで「プラクティスモード」として武器試し打ち・デバッグ可視化・静的敵テストが容易に。

## 音量調整機能 (ユーザー追加リクエスト)
**完了 (test.html のみ。 "とりあえずテスト版だけでいい" 準拠)**

- test.html 内に自己音量変数を追加（create 内）:
  - this.selfFootVol = 0.2
  - this.selfGunVol = 0.6
  - this.sound.volume = 0.5   // master（ブラウザ全体の音量を下げる用）
- コメント明記: "Self sound volume controls (only affects sounds the player hears themselves)" / "Does not change AI hearing range or virtual sound events"
- 実SE再生への適用:
  - 足音: update 内の walk.wav 再生で `volume: scene.selfFootVol` を使用（ハードコード 0.45 を置換）
  - 銃声: window.GameAudio.emitGunshot override で ① virtual emitSound(..., false) により AI/仮想イベントは完全無変更　② 直接 scene.sound.play('shoot', {volume: selfGunVol}) で自分のみ聞こえる実音を調整
- 実行時調整UI（create 内で追加）:
  - 指示テキスト下に「音量調整 (自分の聞こえだけ / 範囲は変わりません)」見出し
  - Master (全体) / Self Foot (足音) / Self Gun (銃声) ごとに [-] [+] ボタン（pointerdown で ±0.1、即反映 + %表示更新）
  - 初期値表示も refresh で正しく出る
- 指示テキスト上部にも使用法を追記（日本語）
- F9 リスタート時も再生成される（デフォルト値に戻るのはテスト用途として許容）

**仕様完全遵守（ユーザーの言葉通り）**
- 「自分の足音と銃声の音量調整機能作れたらよろしく」
- 「あくまでも自分の聞こえてる音だけで画面上の聞こえる範囲とかは変わらないようにできればありがたい」
- 「実際に聞こえる音を下げたいんだよね　ブラウザの音うるさくて」
- 仮想イベント (recentSounds) と AI の getAudibleSounds / 反応ロジック / debug円 (650 gunshot / 190 foot) は一切変更なし。範囲はハードコードのまま。
- メイン側 (js/audio.js の emitSound attenuation や combat の emitGunshot 呼び、main.js の足音) には一切タッチせず、test.html のオーバーライドだけで完結。

これで「ブラウザがうるさい」時に即 [-] で下げて調整しながらテスト可能。ローカルサーバー推奨で test.html を開いて確認を。
