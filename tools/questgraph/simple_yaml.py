"""Small YAML subset loader for the quest/policy authoring files.

This intentionally supports the subset used by this repo: nested mappings, lists,
scalars, empty lists, quoted strings, booleans, nulls, and literal blocks.
It is not a general YAML parser.
"""

from __future__ import annotations


class YamlError(ValueError):
    pass


def load_yaml(path: str):
    with open(path, "r", encoding="utf-8") as handle:
        lines = handle.readlines()
    parser = _Parser(lines, path)
    return parser.parse()


class _Parser:
    def __init__(self, lines, path):
        self.path = path
        self.items = []
        for raw_no, raw in enumerate(lines, 1):
            if not raw.strip() or raw.lstrip().startswith("#"):
                continue
            indent = len(raw) - len(raw.lstrip(" "))
            if "\t" in raw[:indent]:
                raise YamlError(f"{path}:{raw_no}: tabs are not supported")
            self.items.append((raw_no, indent, raw.rstrip("\n")))

    def parse(self):
        if not self.items:
            return {}
        value, idx = self._parse_block(0, self.items[0][1])
        if idx != len(self.items):
            line_no, _, _ = self.items[idx]
            raise YamlError(f"{self.path}:{line_no}: unexpected trailing content")
        return value

    def _parse_block(self, idx, indent):
        if idx >= len(self.items):
            return {}, idx
        _, item_indent, text = self.items[idx]
        if item_indent < indent:
            return {}, idx
        if text[item_indent:].startswith("- "):
            return self._parse_list(idx, indent)
        return self._parse_map(idx, indent)

    def _parse_map(self, idx, indent):
        out = {}
        while idx < len(self.items):
            line_no, item_indent, text = self.items[idx]
            if item_indent < indent:
                break
            if item_indent > indent:
                raise YamlError(f"{self.path}:{line_no}: unexpected indentation")
            body = text[indent:]
            if body.startswith("- "):
                break
            key, sep, rest = body.partition(":")
            if not sep:
                raise YamlError(f"{self.path}:{line_no}: expected key/value mapping")
            key = key.strip()
            rest = rest.strip()
            if not key:
                raise YamlError(f"{self.path}:{line_no}: empty key")
            if rest == "|":
                value, idx = self._parse_literal(idx + 1, indent + 2)
            elif rest == "":
                if idx + 1 < len(self.items) and self.items[idx + 1][1] > indent:
                    value, idx = self._parse_block(idx + 1, self.items[idx + 1][1])
                else:
                    value, idx = {}, idx + 1
            else:
                value = _scalar(rest)
                idx += 1
            out[key] = value
        return out, idx

    def _parse_list(self, idx, indent):
        out = []
        while idx < len(self.items):
            line_no, item_indent, text = self.items[idx]
            if item_indent < indent:
                break
            if item_indent != indent:
                raise YamlError(f"{self.path}:{line_no}: unexpected list indentation")
            body = text[indent:]
            if not body.startswith("- "):
                break
            rest = body[2:].strip()
            if rest == "":
                if idx + 1 < len(self.items) and self.items[idx + 1][1] > indent:
                    value, idx = self._parse_block(idx + 1, self.items[idx + 1][1])
                else:
                    value, idx = {}, idx + 1
            elif ": " in rest and not rest.startswith(("'", '"')):
                key, _, value_text = rest.partition(":")
                value = {}
                key = key.strip()
                value_text = value_text.strip()
                value[key] = _scalar(value_text) if value_text else {}
                idx += 1
                if idx < len(self.items) and self.items[idx][1] > indent:
                    child, idx = self._parse_map(idx, self.items[idx][1])
                    value.update(child)
            else:
                value = _scalar(rest)
                idx += 1
            out.append(value)
        return out, idx

    def _parse_literal(self, idx, indent):
        parts = []
        while idx < len(self.items):
            _, item_indent, text = self.items[idx]
            if item_indent < indent:
                break
            parts.append(text[indent:] if len(text) >= indent else "")
            idx += 1
        return "\n".join(parts).rstrip() + "\n", idx


def _scalar(text):
    if text == "[]":
        return []
    if text == "{}":
        return {}
    if text in ("null", "Null", "NULL", "~"):
        return None
    if text in ("true", "True", "TRUE"):
        return True
    if text in ("false", "False", "FALSE"):
        return False
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        return text[1:-1]
    try:
        if "." in text:
            return float(text)
        return int(text)
    except ValueError:
        return text
