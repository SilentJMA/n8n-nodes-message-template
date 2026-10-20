/**
 * Parses JSON plus the JavaScript object-literal conveniences people get when they copy data from
 * the n8n output panel or a console.log: unquoted keys, single-quoted strings, trailing commas
 * and comments. It is a plain parser, nothing is evaluated.
 */
export class LenientJsonError extends Error {}

const ESCAPES: Record<string, string> = {
	'"': '"',
	"'": "'",
	'\\': '\\',
	'/': '/',
	b: '\b',
	f: '\f',
	n: '\n',
	r: '\r',
	t: '\t',
	v: '\v',
	'0': '\0',
};

export function parseLenientJson(text: string): unknown {
	let pos = 0;

	function fail(message: string): never {
		const before = text.slice(0, pos);
		const line = before.split('\n').length;
		const column = pos - before.lastIndexOf('\n');
		throw new LenientJsonError(`${message} at position ${pos} (line ${line} column ${column})`);
	}

	function skip(): void {
		for (;;) {
			const ch = text[pos];
			if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '﻿') {
				pos++;
			} else if (ch === '/' && text[pos + 1] === '/') {
				while (pos < text.length && text[pos] !== '\n') pos++;
			} else if (ch === '/' && text[pos + 1] === '*') {
				const end = text.indexOf('*/', pos + 2);
				if (end === -1) fail('Unterminated comment');
				pos = end + 2;
			} else {
				return;
			}
		}
	}

	function parseString(): string {
		const quote = text[pos++];
		let result = '';
		for (;;) {
			if (pos >= text.length) fail('Unterminated string');
			const ch = text[pos++];
			if (ch === quote) return result;
			if (ch !== '\\') {
				result += ch;
				continue;
			}
			const esc = text[pos++];
			if (esc === 'u') {
				const hex = text.slice(pos, pos + 4);
				if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('Invalid unicode escape');
				result += String.fromCharCode(parseInt(hex, 16));
				pos += 4;
			} else if (esc === '\n') {
				// line continuation
			} else if (esc in ESCAPES) {
				result += ESCAPES[esc];
			} else {
				result += esc ?? '';
			}
		}
	}

	function parseIdentifier(): string {
		const match = /^[A-Za-z_$][\w$]*/.exec(text.slice(pos));
		if (!match) fail('Expected property name or "}"');
		pos += match[0].length;
		return match[0];
	}

	function parseNumber(): number {
		const match = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(pos));
		if (!match) fail('Unexpected token');
		pos += match[0].length;
		return Number(match[0]);
	}

	function parseValue(): unknown {
		skip();
		const ch = text[pos];
		if (ch === '{') return parseObject();
		if (ch === '[') return parseArray();
		if (ch === '"' || ch === "'") return parseString();
		if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) return parseNumber();
		const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(pos))?.[0];
		if (word === 'true' || word === 'false' || word === 'null') {
			pos += word.length;
			return word === 'null' ? null : word === 'true';
		}
		if (pos >= text.length) fail('Unexpected end of input');
		return fail('Unexpected token');
	}

	function parseObject(): Record<string, unknown> {
		pos++;
		const result: Record<string, unknown> = {};
		for (;;) {
			skip();
			if (text[pos] === '}') {
				pos++;
				return result;
			}
			const ch = text[pos];
			let key: string;
			if (ch === '"' || ch === "'") key = parseString();
			else if (ch >= '0' && ch <= '9') key = String(parseNumber());
			else key = parseIdentifier();
			skip();
			if (text[pos] !== ':') fail("Expected ':' after property name");
			pos++;
			Object.defineProperty(result, key, {
				value: parseValue(),
				enumerable: true,
				writable: true,
				configurable: true,
			});
			skip();
			if (text[pos] === ',') pos++;
			else if (text[pos] !== '}') fail("Expected ',' or '}'");
		}
	}

	function parseArray(): unknown[] {
		pos++;
		const result: unknown[] = [];
		for (;;) {
			skip();
			if (text[pos] === ']') {
				pos++;
				return result;
			}
			result.push(parseValue());
			skip();
			if (text[pos] === ',') pos++;
			else if (text[pos] !== ']') fail("Expected ',' or ']'");
		}
	}

	const value = parseValue();
	skip();
	if (pos < text.length) fail('Unexpected token after the value');
	return value;
}
