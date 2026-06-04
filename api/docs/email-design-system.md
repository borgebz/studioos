# StudioOS — Email Design System

Transactional email design system for **StudioOS — Escola de Dança**, running on Django + Django templates. Emails are dispatched via `django.core.mail.EmailMultiAlternatives` (HTML + plaintext) from `server/templates/emails/`.

---

## Architecture

```
server/templates/emails/
  base.html                                    ← base layout (accent bar, header, footer)
  base_banner.html                             ← extends base.html, adds status banner slot
  pt/
    activation.html
    invite.html
    coaching_approved.html
    coaching_cancelled.html
    coaching_new_request.html
    coaching_participant_cancelled.html
    coaching_attendance_confirmation_reminder.html
    coaching_waiting_confirmation_reminder.html
  en/  (English mirrors of pt/)
```

Every template extends either `emails/base.html` or `emails/base_banner.html`. Child templates only define `{% block title %}`, `{% block preheader %}`, `{% block content %}`, and optionally `{% block footer_extra %}`.

### Adding a new template

1. Create `emails/{lang}/{name}.html`
2. Extend `emails/base.html` (no banner) or `emails/base_banner.html` (with banner)
3. For banner templates, wrap `{% block content %}` in `{% with banner_bg=... banner_border=... banner_color=... banner_icon=... banner_text=... %}`
4. Mirror in the other language folder
5. Add the sending function to `server/coachings/emails.py` or `server/accounts/emails.py`

### `coaching_participant_cancelled` exception

This template has a dynamic banner (error vs. notice depending on `is_late_cancelled`) so it extends `emails/base.html` directly and overrides `{% block banner %}` with a conditional.

---

## Design Tokens

Reference values — **must be inlined** in template `style=""` attributes. Email clients (Outlook especially) strip `<style>` blocks and do not support CSS custom properties.

### Brand

| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#1a8280` | Header bg, h1, primary CTA bg |
| `--brand-primary-hover` | `#146664` | Button hover (progressive enhancement) |
| `--brand-accent` | `#c9a84c` | Gold — accent bar, links, sparing detail |
| `--brand-accent-hover` | `#b08e34` | Link hover |
| `--brand-accent-light` | `#e6c878` | Accent bar gradient mid-stop |

### Surface

| Token | Value | Usage |
|---|---|---|
| `--bg-page` | `#f0f0f5` | Email body background |
| `--bg-card` | `#ffffff` | Card surface |
| `--bg-soft` | `#f6f6fa` | Info card fill |

### Text

| Token | Value | Usage |
|---|---|---|
| `--fg-strong` | `#1a8280` | Headings, strong emphasis |
| `--fg-body` | `#2a2a3a` | Body copy |
| `--fg-muted` | `#5b5b6b` | Meta, secondary copy |
| `--fg-subtle` | `#9a9aa8` | Footer, fineprint |
| `--fg-on-dark` | `#ffffff` | Text on brand-primary surfaces |

### Border

| Token | Value |
|---|---|
| `--border-default` | `#e6e6ee` |
| `--border-strong` | `#d4d4e0` |

### Banner palettes

Each banner needs three values: soft fill bg / saturated icon colour / dark text colour.

| Semantic | bg | border/icon | text | icon glyph | Used by |
|---|---|---|---|---|---|
| success | `#e7f5ec` | `#1f7a3f` | `#145c2d` | `✓` | `coaching_approved` |
| error | `#fdecec` | `#b3261e` | `#8c1a14` | `×` | `coaching_cancelled`, late cancellation |
| warning | `#fff6e0` | `#9a6b00` | `#6e4d00` | `!` | reminders |
| info | `#e8eef9` | `#1f3a8a` | `#15296b` | `?` | `coaching_new_request` |
| notice | `#ffeede` | `#a8530c` | `#7a3c08` | `!` | `coaching_participant_cancelled` (non-late) |

---

## Typography

System font stack only — no webfonts (Outlook ignores them, Gmail can clip).

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif
```

| Role | Size | Weight | Line-height | Notes |
|---|---|---|---|---|
| Wordmark | 20px | 700 | 1 | 0.18em tracking, uppercase |
| Subtitle | 11px | 500 | 1 | 0.22em tracking, uppercase, gold |
| h1 | 22px | 700 | 1.3 | Brand primary colour |
| Body | 16px | 400 | 1.55 | `#2a2a3a` |
| Meta | 14px | 400 | 1.5 | `#5b5b6b` |
| Button | 15px | 600 | — | 0.02em tracking |
| Footer | 13px | 400 | 1.5 | `#9a9aa8` |

---

## Spacing

4px base scale. Emails compose with: `8 / 12 / 16 / 24 / 32 / 40 / 56` px.

- Outer wrapper padding: `32px 16px`
- Card content padding: `32px`
- Footer padding: `24px 32px 28px`
- Banner padding: `18px 32px`
- Info card padding: `16px 20px`

---

## Components

### Accent bar
- Height: `4px`
- `background-color: #c9a84c` (Outlook fallback)
- `background-image: linear-gradient(90deg, #c9a84c 0%, #e6c878 50%, #c9a84c 100%)`

### Header
- Background: `#1a8280`
- Wordmark: `STUDIOOS` — 20px / 700 / 0.18em tracking / white
- Subtitle: `Escola de Dança` — 11px / 500 / 0.22em tracking / `#c9a84c`

### Primary CTA button
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#1a8280; border-radius:6px;">
      <a href="..." class="ea-btn" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:600; letter-spacing:0.02em; color:#ffffff; text-decoration:none; border-radius:6px;">
        CTA Label
      </a>
    </td>
  </tr>
</table>
```
Hover: `#146664` — applied via `.ea-btn:hover` in the `<style>` block (ignored by Outlook).

### Info card
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f6f6fa; border:1px solid #e6e6ee; border-radius:6px; margin:0 0 24px 0;">
  <tr>
    <td style="padding:16px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="110" style="padding:6px 0; font-size:13px; color:#5b5b6b; vertical-align:top;">Label</td>
          <td style="padding:6px 0; font-size:14px; color:#2a2a3a; font-weight:500;">Value</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

### Banner (via `base_banner.html`)
Icon bubble is a 28×28px `<td>` with `border-radius:50%` — degrades to a square in Outlook (acceptable).

### Footer
- Top border: `1px solid #e6e6ee`
- Brand name: `#5b5b6b`, 11px, 0.12em tracking, uppercase
- Subtitle + footer_extra: `#9a9aa8`, 13px
- Default `footer_extra` text: "Recebeu este email porque tem uma conta na plataforma StudioOS." (PT) / "You received this email..." (EN)

---

## Radius & Shadow

| Element | Radius |
|---|---|
| Outer card | `8px` |
| Button | `6px` |
| Info card | `6px` |
| Accent bar | `4px` top corners |

Card shadow: `0 2px 8px rgba(26, 130, 128, 0.06)` — progressive enhancement, ignored in Outlook.

---

## Email client constraints

- All layout via `<table role="presentation">` — no flex, no grid.
- All visual styles are inlined — no external stylesheets.
- `linear-gradient` always has a solid `background-color` fallback before it (Outlook strips gradients).
- `box-shadow` is progressive enhancement.
- No JavaScript. No webfonts.
- A single `<style>` block in `base.html` handles: resets, hover states (`.ea-btn:hover`, `.ea-link:hover`), and a `@media (max-width: 480px)` mobile override.
- MSO conditional comment in `<head>` forces Arial for Outlook.

---

## Voice & tone

- **Language:** European Portuguese (`pt-PT`) primary; English mirror in `en/`.
- **Casing:** sentence case for body copy and CTAs. Brand wordmark is `STUDIOOS` (all caps).
- **Address:** recipient by first name (`Olá, {{ recipient.first_name }}`). School referred to in third person ("a StudioOS").
- **No emoji.** Status conveyed by coloured banner + ASCII glyph (`✓ × ! ?`).
- **No exclamation marks.** Quietly premium — state the fact, give context, one CTA.
- **Preheader:** each template sets `{% block preheader %}` with a specific one-line summary that inboxes show next to the subject line.

---

## Logo

No logo asset currently — wordmark is typeset in HTML. When a logomark is available:

1. Export as 2× PNG, ≤ 200px wide, transparent or white background.
2. Drop into `server/static/emails/logo.png` and host it publicly.
3. In `base.html`, replace the wordmark `<div>` blocks with:
```html
<img src="https://your-domain.com/static/emails/logo.png" width="120" alt="StudioOS" style="display:block; border:0;" />
```
