"""The one branded layout every email from the Institute is sent in, as HTML and as plain text."""

import html
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

_FOREST_DEEP: Final = "#10302a"
_INK: Final = "#0f2a23"
_MUTED: Final = "#4b5f58"
_PAPER: Final = "#f6f3ec"
_PAGE: Final = "#ece6da"
_TINT: Final = "#e3ece6"
_LINE: Final = "#d6d3c6"
_GOLD: Final = "#c3a872"
_SAGE: Final = "#c9ddd3"
_SERIF: Final = "Georgia, 'Times New Roman', serif"
_SANS: Final = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
_INSTITUTE: Final = "GameChanger Institute"
_FULL_TABLE: Final = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"'


@dataclass(frozen=True, slots=True)
class Highlight:
    label: str
    value: str
    prominent: bool = False


@dataclass(frozen=True, slots=True)
class Action:
    label: str
    url: str


@dataclass(frozen=True, slots=True)
class EmailContent:
    preheader: str
    heading: str
    greeting: str
    intro: Sequence[str]
    footnote: str
    highlight: Highlight | None = None
    steps_title: str | None = None
    steps: Sequence[tuple[str, str]] = ()
    outro: Sequence[str] = ()
    action: Action | None = None


def render_text(content: EmailContent, site_url: str) -> str:
    lines = [content.greeting, "", *_spaced(content.intro)]
    if content.highlight:
        lines += [f"{content.highlight.label}: {content.highlight.value}", ""]
    if content.steps:
        lines += [f"{content.steps_title}:" if content.steps_title else "", ""]
        for number, (title, body) in enumerate(content.steps, start=1):
            lines += [f"{number}. {title}", f"   {body}", ""]
    lines += _spaced(content.outro)
    if content.action:
        lines += [f"{content.action.label}: {content.action.url}", ""]
    lines += ["Warm regards,", _INSTITUTE, site_url, "", content.footnote, f"Privacy notice: {site_url}/privacy/", ""]
    return "\n".join(lines)


def render_html(content: EmailContent, site_url: str) -> str:
    site = html.escape(site_url, quote=True)
    body = "".join(
        [
            _heading(content.heading),
            _paragraph(content.greeting),
            *(_paragraph(text) for text in content.intro),
            _highlight(content.highlight) if content.highlight else "",
            _steps(content.steps_title, content.steps) if content.steps else "",
            *(_paragraph(text) for text in content.outro),
            _button(content.action) if content.action else "",
            _paragraph(f"Warm regards,<br>{_INSTITUTE}", escape=False),
        ]
    )
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">'
        f"<title>{html.escape(content.heading)}</title></head>"
        f'<body style="margin:0;padding:0;background:{_PAGE};">'
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">'
        f"{html.escape(content.preheader)}</div>"
        f'{_FULL_TABLE} style="background:{_PAGE};">'
        '<tr><td align="center" style="padding:32px 12px;">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" '
        f'style="width:100%;max-width:600px;background:{_PAPER};border:1px solid {_LINE};">'
        f'<tr><td bgcolor="{_FOREST_DEEP}" background="{site}/email/header.png" '
        f'style="background:{_FOREST_DEEP} url({site}/email/header.png) right center / cover no-repeat;'
        'padding:30px 36px;">'
        f'<a href="{site}/" style="text-decoration:none;">'
        f'<img src="{site}/email/logo.png" width="220" height="58" alt="{_INSTITUTE}" '
        f'style="display:block;border:0;color:{_PAPER};font:400 22px {_SERIF};"></a></td></tr>'
        f'<tr><td style="height:3px;line-height:3px;font-size:0;background:{_GOLD};">&nbsp;</td></tr>'
        f'<tr><td style="padding:36px 36px 28px;">{body}</td></tr>'
        f'<tr><td bgcolor="{_FOREST_DEEP}" style="background:{_FOREST_DEEP};padding:24px 36px;'
        f'font:400 13px/1.6 {_SANS};color:{_SAGE};">'
        f'<p style="margin:0 0 10px;">{html.escape(content.footnote)}</p>'
        f'<p style="margin:0;"><a href="{site}/" style="color:{_PAPER};">{html.escape(_host(site_url))}</a>'
        f' &nbsp;&middot;&nbsp; <a href="{site}/privacy/" style="color:{_PAPER};">Privacy notice</a></p>'
        "</td></tr></table></td></tr></table></body></html>"
    )


def _spaced(paragraphs: Sequence[str]) -> list[str]:
    return [line for paragraph in paragraphs for line in (paragraph, "")]


def _host(site_url: str) -> str:
    return site_url.partition("://")[2] or site_url


def _heading(text: str) -> str:
    return f'<h1 style="margin:0 0 22px;font:400 28px/1.2 {_SERIF};color:{_INK};">{html.escape(text)}</h1>'


def _paragraph(text: str, *, escape: bool = True) -> str:
    content = html.escape(text) if escape else text
    return f'<p style="margin:0 0 16px;font:400 16px/1.6 {_SANS};color:{_INK};">{content}</p>'


def _highlight(highlight: Highlight) -> str:
    value_style = (
        f"font:400 34px/1.2 {_SERIF};letter-spacing:8px;" if highlight.prominent else f"font:600 15px/1.5 {_SANS};"
    )
    return (
        f'{_FULL_TABLE} style="margin:8px 0 24px;">'
        f'<tr><td style="background:{_TINT};border-left:3px solid {_GOLD};padding:16px 20px;">'
        f'<p style="margin:0 0 4px;font:600 12px/1.4 {_SANS};color:{_MUTED};">{html.escape(highlight.label)}</p>'
        f'<p style="margin:0;{value_style}color:{_INK};word-break:break-all;">{html.escape(highlight.value)}</p>'
        "</td></tr></table>"
    )


def _steps(title: str | None, steps: Sequence[tuple[str, str]]) -> str:
    rows = "".join(
        "<tr>"
        f'<td width="36" valign="top" style="padding:0 0 16px;font:400 22px/1.3 {_SERIF};color:{_GOLD};">{number}</td>'
        f'<td valign="top" style="padding:0 0 16px;font:400 15px/1.55 {_SANS};color:{_MUTED};">'
        f'<strong style="display:block;font-weight:600;color:{_INK};">{html.escape(step)}</strong>'
        f"{html.escape(detail)}</td></tr>"
        for number, (step, detail) in enumerate(steps, start=1)
    )
    heading = (
        f'<h2 style="margin:0 0 14px;font:400 20px/1.3 {_SERIF};color:{_INK};">{html.escape(title)}</h2>'
        if title
        else ""
    )
    return f'{heading}{_FULL_TABLE} style="margin:0 0 8px;">{rows}</table>'


def _button(action: Action) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 26px;"><tr>'
        f'<td bgcolor="{_FOREST_DEEP}" style="background:{_FOREST_DEEP};border-radius:2px;">'
        f'<a href="{html.escape(action.url, quote=True)}" style="display:inline-block;padding:13px 24px;'
        f'font:600 15px/1 {_SANS};color:{_PAPER};text-decoration:none;">{html.escape(action.label)}</a>'
        "</td></tr></table>"
    )
