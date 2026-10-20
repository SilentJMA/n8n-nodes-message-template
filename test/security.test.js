const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { parseXml, xmlToJson } = require('../dist/nodes/MessageTemplate/xml');

const toJson = (xml) =>
	xmlToJson(parseXml(xml), { attributes: 'group', attributeKey: '$', textKey: '_', includeRoot: true, alwaysArray: false, trim: true });

afterEach(() => {
	delete Object.prototype.polluted;
});

test('XML element and attribute names cannot change prototypes', () => {
	const json = toJson('<r><__proto__><polluted>1</polluted></__proto__></r>');
	assert.equal({}.polluted, undefined);
	assert.equal(Object.getPrototypeOf(json.r), Object.prototype);
	const attrs = parseXml('<r __proto__="x" constructor="y"/>').root.attributes;
	assert.equal(Object.getPrototypeOf(attrs), Object.prototype);
	assert.equal(attrs.constructor, 'y');
	assert.throws(() => parseXml('<r a="1" a="2"/>'), /Duplicate attribute "a"/);
});

test('no external entities or entity expansion', () => {
	const json = toJson('<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>');
	assert.equal(json.r, '&x;');
});

test('deeply nested XML fails cleanly instead of exhausting the stack', () => {
	assert.throws(() => parseXml('<a>'.repeat(5000) + '</a>'.repeat(5000)), /nested more than 1000 levels/);
});
