const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseXml, xmlToJson, formatXml } = require('../dist/nodes/MessageTemplate/xml');
const { MessageTemplate } = require('../dist/nodes/MessageTemplate/MessageTemplate.node');

const defaults = { attributes: 'group', attributeKey: '$', textKey: '_', includeRoot: true, alwaysArray: false, trim: true };
const sample = `<?xml version="1.0" encoding="UTF-8"?>
<!-- orders -->
<orders count="2"><order id="A1"><customer>Ann &amp; Co</customer><total currency="EUR">10.50</total></order>
<order id="B2"><customer><![CDATA[Bo <the> Builder]]></customer><total currency="USD">7</total><note/></order></orders>`;

test('converts XML to selectable JSON (grouped attributes, arrays for repeats)', () => {
	assert.deepEqual(xmlToJson(parseXml(sample), defaults), {
		orders: {
			$: { count: '2' },
			order: [
				{ $: { id: 'A1' }, customer: 'Ann & Co', total: { $: { currency: 'EUR' }, _: '10.50' } },
				{ $: { id: 'B2' }, customer: 'Bo <the> Builder', total: { $: { currency: 'USD' }, _: '7' }, note: '' },
			],
		},
	});
});

test('merge attributes, drop root, always arrays', () => {
	const json = xmlToJson(parseXml('<r><a x="1">t</a></r>'), { ...defaults, attributes: 'merge', includeRoot: false, alwaysArray: true });
	assert.deepEqual(json, { a: [{ x: ['1'], _: 't' }] });
});

test('ignore attributes', () => {
	assert.deepEqual(xmlToJson(parseXml('<r a="1"><b c="2">x</b></r>'), { ...defaults, attributes: 'ignore' }), { r: { b: 'x' } });
});

test('pretty prints XML', () => {
	assert.equal(
		formatXml(parseXml('<?xml version="1.0"?><r a="1&amp;2"><b>x &lt; y</b><c/><!--hi--><d><e>1</e></d></r>')),
		[
			'<?xml version="1.0"?>',
			'<r a="1&amp;2">',
			'  <b>x &lt; y</b>',
			'  <c/>',
			'  <!--hi-->',
			'  <d>',
			'    <e>1</e>',
			'  </d>',
			'</r>',
		].join('\n'),
	);
});

test('reports errors with line and column', () => {
	assert.throws(() => parseXml('<a>\n  <b></c>\n</a>'), /Expected <\/b> but found <\/c> \(line 2, column 6\)/);
	assert.throws(() => parseXml('<a/><b/>'), /Only one root element/);
	assert.throws(() => parseXml('<a x=1/>'), /must be quoted/);
	assert.throws(() => parseXml('<a>'), /Missing closing tag <\/a>/);
	assert.throws(() => parseXml('hello'), /outside the root element/);
});

function run(params, input) {
	const ctx = {
		getInputData: () => input,
		getNode: () => ({ name: 'Message Template', type: 'messageTemplate', typeVersion: 1, parameters: {} }),
		continueOnFail: () => false,
		getNodeParameter(name, i, fallback) {
			const value = params[name];
			if (typeof value === 'function') return value(input[i].json, i);
			return value === undefined ? fallback : value;
		},
		helpers: {},
	};
	return new MessageTemplate().execute.call(ctx);
}

test('node: XML output per item with formatted XML field', async () => {
	const [out] = await run(
		{
			mode: 'eachItem',
			outputFormat: 'xml',
			xmlOptions: { formattedXmlField: 'xml' },
			template: (json) => `<user id="${json.id}"><name>${json.name}</name></user>`,
		},
		[{ json: { id: '7', name: 'Ann' } }],
	);
	assert.deepEqual(out[0].json, {
		user: { $: { id: '7' }, name: 'Ann' },
		xml: '<user id="7">\n  <name>Ann</name>\n</user>',
	});
});

test('node: combine items into one XML document', async () => {
	const [out] = await run(
		{
			mode: 'combine',
			outputFormat: 'xml',
			header: '<ids>',
			separator: '',
			footer: '</ids>',
			template: (json) => `<id>${json.id}</id>`,
		},
		[{ json: { id: '1' } }, { json: { id: '2' } }],
	);
	assert.deepEqual(out[0].json, { ids: { id: ['1', '2'] } });
});

test('node: invalid XML gives a helpful error', async () => {
	await assert.rejects(
		run({ mode: 'eachItem', outputFormat: 'xml', template: '<a>Tom & Jerry</b>' }, [{ json: {} }]),
		/not valid XML/,
	);
});
