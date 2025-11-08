# VSCode Extension Idea：English Docstring / Comments → Japanese Translation (Claude)

## 概要
英語で書かれた docstring やコメントを VSCode 上で hover した際に、日本語に翻訳して表示する拡張機能。

新人オンボーディング、コードレビュー、生産性向上へ直接効くユースケースを狙う。

## 選択した方向性
- UI：**Hover Provider**
- 対象言語：**Python**
- 翻訳方向：英語 → 日本語
- 翻訳対象テキスト：docstring / コメントブロック（行単位ではなくブロック単位）
- 翻訳エンジン：**Claude**（LLM）

## 翻訳ポリシー
- 技術用語・関数名・クラス名・ライブラリ名はそのまま保持
- 直訳ではなく「自然な」日本語に寄せる
- 日本語のみを出力（説明不要）

## Claude 翻訳プロンプト案

```
You are a translation assistant specialized in software engineering context.
Translate the given text from English into natural Japanese.

Rules:

Preserve technical terms (library names, function names, class names, variable names) as they are.

Prefer natural Japanese rather than literal translation.

Output ONLY the translated Japanese text. No explanation, no English.

Translate this text:
{{COMMENT_TEXT}}
```

## ブロック検出仕様（MVP版）
- docstring (`""" ～ """`) を最優先で抽出
- docstringでない場合、`# ` で連続するコメント行ブロックを抽出
- hover対象のカーソル位置から上下方向に探索してブロック範囲決定

## MVP完了条件
VSCodeで Python ファイルを開き、docstring もしくはコメント上に hover すると  
→ Claude に翻訳要求  
→ 日本語訳を hover Tooltip に表示

### 当日追加余力の次フェーズ案
- TextEditorDecorationType を使い、inline overlay（Sublime Phantom 的UI）表示にも対応
- 翻訳キャッシュ
