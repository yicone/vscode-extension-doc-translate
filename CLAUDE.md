# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VSCode extension that translates English docstrings and comments to Japanese using Claude API. The extension targets Python code and provides translations through a hover provider.

**Target Use Cases:** New developer onboarding, code review, productivity improvement

## Project Status

Early stage - specification defined in `docs/spec.md`, implementation not yet started.

## Architecture (from spec.md)

### Core Components

- **UI**: Hover Provider (shows translation on hover over docstrings/comments)
- **Target Language**: Python
- **Translation Direction**: English → Japanese
- **Translation Target**: Docstrings and comment blocks (not individual lines)
- **Translation Engine**: Claude API

### Translation Policy

- Preserve technical terms, function names, class names, library names as-is
- Natural Japanese translation (not literal)
- Output only Japanese text (no explanations)

### Translation Prompt Template

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

### Block Detection Specification (MVP)

1. Extract docstrings (`""" ～ """`) with highest priority
2. If not a docstring, extract consecutive comment lines starting with `# `
3. Determine block range by searching up/down from hover cursor position

## MVP Completion Criteria

- Open Python file in VSCode
- Hover over docstring or comment
- Send translation request to Claude
- Display Japanese translation in hover tooltip

## Next Phase Features

- Inline overlay display using TextEditorDecorationType (Sublime Phantom-style UI)
- Translation caching
