const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MessageTemplate } = require('../dist/nodes/MessageTemplate/MessageTemplate.node');

const items = [
	{ json: { id: 'A1', name: 'Ann' } },
	{ json: { id: 'B2', name: 'Bo "the" Builder' } },
];

// Parameters given as functions receive the item, mimicking n8n evaluating an expression per item.
function run(params, input = items, { continueOnFail = false } = {}) {
	const ctx = {
		getInputData: () => input,
		getNode: () => ({ name: 'Message Template', type: 'messageTemplate', typeVersion: 1, parameters: {} }),
		continueOnFail: () => continueOnFail,
		getNodeParameter(name, i, fallback) {
			const value = params[name];
			if (typeof value === 'function') return value(input[i].json, i);
			return value === undefined ? fallback : value;
		},
		helpers: {
			prepareBinaryData: async (buf, fileName, mimeType) => ({ data: buf.toString('base64'), fileName, mimeType }),
		},
	};
	return new MessageTemplate().execute.call(ctx);
}

test('renders text per item', async () => {
	const [out] = await run({
		mode: 'eachItem',
		outputFormat: 'text',
		outputField: 'message',
		template: (json) => `Hello ${json.name}`,
	});
	assert.deepEqual(out.map((o) => o.json), [{ message: 'Hello Ann' }, { message: 'Hello Bo "the" Builder' }]);
	assert.deepEqual(out[1].pairedItem, { item: 1 });
});

test('includes input fields when asked', async () => {
	const [out] = await run({
		mode: 'eachItem',
		outputFormat: 'text',
		outputField: 'greeting',
		options: { includeInputFields: true },
		template: (json) => `Hi ${json.name}`,
	}, [items[0]]);
	assert.deepEqual(out[0].json, { id: 'A1', name: 'Ann', greeting: 'Hi Ann' });
});

test('parses JSON output', async () => {
	const [out] = await run({
		mode: 'eachItem',
		outputFormat: 'json',
		template: (json) => `{"id": ${JSON.stringify(json.id)}, "name": ${JSON.stringify(json.name)}}`,
	});
	assert.deepEqual(out.map((o) => o.json), [
		{ id: 'A1', name: 'Ann' },
		{ id: 'B2', name: 'Bo "the" Builder' },
	]);
});

test('JSON array output becomes one item per element', async () => {
	const [out] = await run({ mode: 'eachItem', outputFormat: 'json', template: '[{"a":1},{"a":2},3]' }, [items[0]]);
	assert.deepEqual(out.map((o) => o.json), [{ a: 1 }, { a: 2 }, { data: 3 }]);
});

test('JSON output accepts a JavaScript object literal', async () => {
	const template = `{
  OrderID: 'A1',
  Amount: '129.50',
  Items: [ { SKU: 'P-1', Qty: '2' }, { SKU: "it's", Qty: 1 } ], // comment
  internalNote: 'ignored by auto-map',
}`;
	const [out] = await run({ mode: 'eachItem', outputFormat: 'json', template }, [items[0]]);
	assert.deepEqual(out[0].json, {
		OrderID: 'A1',
		Amount: '129.50',
		Items: [{ SKU: 'P-1', Qty: '2' }, { SKU: "it's", Qty: 1 }],
		internalNote: 'ignored by auto-map',
	});
});

test('lenient JSON does not evaluate code or pollute prototypes', async () => {
	await assert.rejects(
		run({ mode: 'eachItem', outputFormat: 'json', template: '{a: process.exit(1)}' }, [items[0]]),
		/not valid JSON/,
	);
	const [out] = await run({ mode: 'eachItem', outputFormat: 'json', template: "{__proto__: {x: 1}, a: 1,}" }, [items[0]]);
	assert.equal({}.x, undefined);
	assert.equal(out[0].json.a, 1);
});

test('invalid JSON gives a helpful error', async () => {
	await assert.rejects(
		run({ mode: 'eachItem', outputFormat: 'json', template: '{"a": oops}' }, [items[0]]),
		/not valid JSON/,
	);
});

test('continueOnFail returns the error as an item', async () => {
	const [out] = await run(
		{ mode: 'eachItem', outputFormat: 'json', template: 'nope' },
		[items[0]],
		{ continueOnFail: true },
	);
	assert.match(out[0].json.error, /not valid JSON/);
});

test('combine mode joins items with header, separator and footer', async () => {
	const [out] = await run({
		mode: 'combine',
		outputFormat: 'json',
		header: '[',
		separator: ',',
		footer: ']',
		template: (json) => JSON.stringify({ id: json.id }),
	});
	assert.deepEqual(out.map((o) => o.json), [{ id: 'A1' }, { id: 'B2' }]);
	assert.deepEqual(out[0].pairedItem, [{ item: 0 }, { item: 1 }]);
});

test('combine mode as text', async () => {
	const [out] = await run({
		mode: 'combine',
		outputFormat: 'text',
		outputField: 'ids',
		separator: ', ',
		template: (json) => json.id,
	});
	assert.equal(out.length, 1);
	assert.deepEqual(out[0].json, { ids: 'A1, B2' });
});

test('empty template outputs an empty message', async () => {
	const [out] = await run({ mode: 'eachItem', outputFormat: 'text', outputField: 'message', template: '' }, [items[0]]);
	assert.deepEqual(out[0].json, { message: '' });
});

test('file output with CR line endings', async () => {
	const [out] = await run({
		mode: 'eachItem',
		outputFormat: 'binary',
		binaryPropertyName: 'data',
		fileName: 'msg.hl7',
		mimeType: 'text/plain',
		options: { lineEnding: 'cr' },
		template: (json) => `MSH|${json.id}\nPID|1`,
	}, [items[0]]);
	assert.equal(out[0].binary.data.fileName, 'msg.hl7');
	assert.equal(Buffer.from(out[0].binary.data.data, 'base64').toString(), 'MSH|A1\rPID|1');
});
