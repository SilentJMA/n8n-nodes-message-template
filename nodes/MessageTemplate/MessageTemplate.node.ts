import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { formatXml, parseXml, xmlToJson, type XmlToJsonOptions } from './xml';

type Mode = 'eachItem' | 'combine';
type OutputFormat = 'text' | 'json' | 'xml' | 'binary';
type LineEnding = 'keep' | 'lf' | 'crlf' | 'cr';

export class MessageTemplate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Message Template',
		name: 'messageTemplate',
		icon: { light: 'file:message.svg', dark: 'file:message.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["mode"] === "combine" ? "Combine all items" : "Each item" }}',
		description: 'Render text, JSON, XML or a file from an expression template',
		defaults: {
			name: 'Message Template',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for Each Item',
						value: 'eachItem',
						description: 'Render the template for every input item and output one item per input',
					},
					{
						name: 'Combine All Items',
						value: 'combine',
						description:
							'Render the template for every input item and join the results into a single output item',
					},
				],
				default: 'eachItem',
			},
			{
				displayName: 'Template',
				name: 'template',
				type: 'string',
				typeOptions: { rows: 10 },
				default: '',
				placeholder: 'Hello {{ $json.name }}, your order {{ $json.orderId }} has shipped.',
				description:
					'Content to render. Use expressions to insert data from the current item. Leave empty to output an empty message.',
				hint: 'When building JSON, insert values with {{ JSON.stringify($json.field) }} so quotes and special characters are escaped',
			},
			{
				displayName: 'Header',
				name: 'header',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				placeholder: '[',
				description: 'Text placed before the combined output',
				displayOptions: { show: { mode: ['combine'] } },
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				default: '\n',
				description: 'Text placed between the rendered items',
				displayOptions: { show: { mode: ['combine'] } },
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				placeholder: ']',
				description: 'Text placed after the combined output',
				displayOptions: { show: { mode: ['combine'] } },
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Put the rendered text into a field',
					},
					{
						name: 'JSON',
						value: 'json',
						description:
							'Parse the rendered text as JSON and output it as the item. An array outputs one item per element.',
					},
					{
						name: 'XML',
						value: 'xml',
						description:
							'Parse the rendered text as XML and output it as structured data whose fields you can select, like JSON',
					},
					{
						name: 'File',
						value: 'binary',
						description: 'Output the rendered text as a binary file',
					},
				],
				default: 'text',
			},
			{
				displayName: 'Put Output in Field',
				name: 'outputField',
				type: 'string',
				default: 'message',
				required: true,
				displayOptions: { show: { outputFormat: ['text'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the output binary field to put the file in',
				displayOptions: { show: { outputFormat: ['binary'] } },
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'message.txt',
				displayOptions: { show: { outputFormat: ['binary'] } },
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: 'text/plain',
				displayOptions: { show: { outputFormat: ['binary'] } },
			},
			{
				displayName: 'XML Options',
				name: 'xmlOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { outputFormat: ['xml'] } },
				options: [
					{
						displayName: 'Add Formatted XML Field',
						name: 'formattedXmlField',
						type: 'string',
						default: 'xml',
						description:
							'Also store the pretty-printed XML in this field, e.g. to send it on with an HTTP Request node',
					},
					{
						displayName: 'Always Use Arrays',
						name: 'alwaysArray',
						type: 'boolean',
						default: false,
						description:
							'Whether to put every child element in an array, even when it appears only once. Keeps the structure stable when the count varies.',
					},
					{
						displayName: 'Attribute Key',
						name: 'attributeKey',
						type: 'string',
						default: '$',
						description: 'Field that holds the attributes of an element when they are grouped',
						displayOptions: { show: { attributes: ['group'] } },
					},
					{
						displayName: 'Attributes',
						name: 'attributes',
						type: 'options',
						options: [
							{
								name: 'Group Under Attribute Key',
								value: 'group',
								description: 'For example { "$": { "currency": "EUR" } }',
							},
							{
								name: 'Merge Into Element',
								value: 'merge',
								description: 'For example { "currency": "EUR" }',
							},
							{ name: 'Ignore', value: 'ignore' },
						],
						default: 'group',
					},
					{
						displayName: 'Include Root Element',
						name: 'includeRoot',
						type: 'boolean',
						default: true,
						description: 'Whether to wrap the output in a field named after the root element',
					},
					{
						displayName: 'Text Key',
						name: 'textKey',
						type: 'string',
						default: '_',
						description:
							'Field that holds the text of an element that also has attributes or child elements',
					},
					{
						displayName: 'Trim Whitespace',
						name: 'trim',
						type: 'boolean',
						default: true,
						description: 'Whether to remove leading and trailing whitespace from text values',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Include Other Input Fields',
						name: 'includeInputFields',
						type: 'boolean',
						default: false,
						description:
							'Whether to pass the input fields and files through to the output. Only applies to Run Once for Each Item with Text or File output.',
					},
					{
						displayName: 'Line Endings',
						name: 'lineEnding',
						type: 'options',
						options: [
							{ name: 'Keep As Is', value: 'keep' },
							{ name: 'Unix (LF)', value: 'lf' },
							{ name: 'Windows (CRLF)', value: 'crlf' },
							{ name: 'Carriage Return Only (CR)', value: 'cr' },
						],
						default: 'keep',
						description: 'Convert all line breaks in the output to this style',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as Mode;
		const outputFormat = this.getNodeParameter('outputFormat', 0) as OutputFormat;
		const returnData: INodeExecutionData[] = [];

		if (mode === 'combine') {
			try {
				const parts = items.map((_, i) => renderItem(this, i));
				const header = this.getNodeParameter('header', 0, '') as string;
				const separator = this.getNodeParameter('separator', 0, '') as string;
				const footer = this.getNodeParameter('footer', 0, '') as string;
				const text = applyLineEnding(header + parts.join(separator) + footer, getLineEnding(this, 0));
				const pairedItem = items.map((_, i) => ({ item: i }));
				const output = await buildOutput(this, text, outputFormat, 0, undefined);
				returnData.push(...output.map((item) => ({ ...item, pairedItem })));
			} catch (error) {
				if (!this.continueOnFail()) {
					throw error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error);
				}
				returnData.push({
					json: { error: error.message },
					pairedItem: items.map((_, i) => ({ item: i })),
				});
			}
			return [returnData];
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const text = applyLineEnding(renderItem(this, i), getLineEnding(this, i));
				const inputItem = options.includeInputFields ? items[i] : undefined;
				returnData.push(...(await buildOutput(this, text, outputFormat, i, inputItem)));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function renderItem(ctx: IExecuteFunctions, itemIndex: number): string {
	const value = ctx.getNodeParameter('template', itemIndex, '') as unknown;
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function getLineEnding(ctx: IExecuteFunctions, itemIndex: number): LineEnding {
	const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject;
	return (options.lineEnding as LineEnding) ?? 'keep';
}

export function applyLineEnding(text: string, mode: LineEnding): string {
	if (mode === 'keep') return text;
	const lf = text.replace(/\r\n?/g, '\n');
	if (mode === 'lf') return lf;
	return lf.replace(/\n/g, mode === 'crlf' ? '\r\n' : '\r');
}

async function buildOutput(
	ctx: IExecuteFunctions,
	text: string,
	outputFormat: OutputFormat,
	itemIndex: number,
	inputItem: INodeExecutionData | undefined,
): Promise<INodeExecutionData[]> {
	const pairedItem = { item: itemIndex };

	if (outputFormat === 'json') {
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch (error) {
			throw new NodeOperationError(ctx.getNode(), `The rendered template is not valid JSON`, {
				itemIndex,
				description: `${error.message}. Insert string values with {{ JSON.stringify($json.field) }} so they are quoted and escaped correctly.`,
			});
		}
		const entries = Array.isArray(parsed) ? parsed : [parsed];
		return entries.map((entry) => ({
			json:
				entry !== null && typeof entry === 'object' && !Array.isArray(entry)
					? (entry as IDataObject)
					: { data: entry as IDataObject },
			pairedItem,
		}));
	}

	if (outputFormat === 'xml') {
		const xmlOptions = ctx.getNodeParameter('xmlOptions', itemIndex, {}) as IDataObject;
		let document;
		try {
			document = parseXml(text);
		} catch (error) {
			throw new NodeOperationError(ctx.getNode(), 'The rendered template is not valid XML', {
				itemIndex,
				description: `${error.message}. Escape special characters in values, e.g. {{ $json.field.replaceAll('&', '&amp;').replaceAll('<', '&lt;') }}.`,
			});
		}
		const options: XmlToJsonOptions = {
			attributes: (xmlOptions.attributes as XmlToJsonOptions['attributes']) ?? 'group',
			attributeKey: (xmlOptions.attributeKey as string) || '$',
			textKey: (xmlOptions.textKey as string) || '_',
			includeRoot: xmlOptions.includeRoot !== false,
			alwaysArray: xmlOptions.alwaysArray === true,
			trim: xmlOptions.trim !== false,
		};
		const json = xmlToJson(document, options) as IDataObject;
		if (xmlOptions.formattedXmlField) {
			json[xmlOptions.formattedXmlField as string] = formatXml(document);
		}
		return [{ json, pairedItem }];
	}

	const json: IDataObject = inputItem ? { ...inputItem.json } : {};

	if (outputFormat === 'binary') {
		const binaryPropertyName = ctx.getNodeParameter('binaryPropertyName', itemIndex) as string;
		const fileName = ctx.getNodeParameter('fileName', itemIndex, 'message.txt') as string;
		const mimeType = ctx.getNodeParameter('mimeType', itemIndex, 'text/plain') as string;
		const binaryData = await ctx.helpers.prepareBinaryData(
			Buffer.from(text, 'utf8'),
			fileName,
			mimeType,
		);
		return [
			{
				json,
				binary: { ...inputItem?.binary, [binaryPropertyName]: binaryData },
				pairedItem,
			},
		];
	}

	const outputField = ctx.getNodeParameter('outputField', itemIndex) as string;
	return [
		{
			json: { ...json, [outputField]: text },
			...(inputItem?.binary ? { binary: inputItem.binary } : {}),
			pairedItem,
		},
	];
}
