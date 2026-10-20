# n8n-nodes-message-template

[![npm version](https://img.shields.io/npm/v/n8n-nodes-message-template.svg)](https://www.npmjs.com/package/n8n-nodes-message-template)
[![CI](https://github.com/SilentJMA/n8n-nodes-message-template/actions/workflows/ci.yml/badge.svg)](https://github.com/SilentJMA/n8n-nodes-message-template/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An [n8n](https://n8n.io) community node that renders a message from an expression template and outputs it as **text, JSON, XML or a file**, once per item or combined across all items.

Use it to build API request bodies, SOAP/XML documents, emails, CSV exports, or HL7 and other line-based formats, without writing a Code node.

- [Installation](#installation)
- [Quick start](#quick-start)
- [Parameters](#parameters)
- [Output formats in detail](#output-formats-in-detail)
- [Examples](#examples)
- [Tips](#tips)
- [Compatibility](#compatibility)
- [Development](#development)
- [License](#license)

## Installation

### From the n8n UI (recommended)

1. In n8n, open **Settings → Community Nodes**.
2. Select **Install**, enter `n8n-nodes-message-template`, accept the risk notice and install.
3. Search for **Message Template** in the node panel.

See the [n8n community nodes guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

### Manually (self-hosted, Docker, Unraid)

The package has no runtime dependencies, so you can also drop it into n8n's `custom` folder:

```bash
# inside your n8n data folder (mapped to /home/node/.n8n in the official Docker image)
mkdir -p custom && cd custom
npm pack n8n-nodes-message-template
tar -xzf n8n-nodes-message-template-*.tgz && mv package n8n-nodes-message-template
```

Restart n8n afterwards. On Unraid the data folder is usually `/mnt/user/appdata/n8n`.

## Quick start

1. Add a **Message Template** node after any node that outputs items.
2. Type your content in **Template** and insert data with expressions, for example `Hello {{ $json.name }}`.
3. Pick an **Output Format** and run the node.

Import [`examples/message-template-examples.json`](examples/message-template-examples.json) into n8n (**Workflows → Import from File**) to see JSON, XML and CSV output side by side.

## Parameters

| Parameter | Description |
| --- | --- |
| **Mode** | *Run Once for Each Item* renders the template for every input item and outputs one item each. *Combine All Items* renders it for every item and joins the results into a single output item. |
| **Template** | The content to render. Any n8n expression works (`$json`, `$itemIndex`, `$now`, `$('Other node')`, …). An empty template outputs an empty message. |
| **Header** | *Combine mode only.* Text placed before the joined output, e.g. `[` or `<orders>`. |
| **Separator** | *Combine mode only.* Text placed between rendered items. Defaults to a new line. |
| **Footer** | *Combine mode only.* Text placed after the joined output, e.g. `]` or `</orders>`. |
| **Output Format** | *Text*, *JSON*, *XML* or *File*. See below. |
| **Put Output in Field** | *Text only.* Field that receives the rendered text. Default `message`. |
| **Put Output File in Field** | *File only.* Binary field name. Default `data`. |
| **File Name** / **MIME Type** | *File only.* Default `message.txt` / `text/plain`. |

### XML Options

| Option | Default | Description |
| --- | --- | --- |
| Add Formatted XML Field | off (`xml` when added) | Also stores the pretty-printed XML in this field, ready to send on with an HTTP Request node. |
| Attributes | Group Under Attribute Key | *Group* puts attributes under `$`, *Merge Into Element* adds them as normal fields, *Ignore* drops them. |
| Attribute Key | `$` | Key used when attributes are grouped. |
| Text Key | `_` | Key for an element's text when it also has attributes or children. |
| Always Use Arrays | off | Wraps every child element in an array, so the structure is the same whether there is one element or many. |
| Include Root Element | on | Wraps the output in a field named after the root element. |
| Trim Whitespace | on | Trims leading and trailing whitespace from text values. |

### Options

| Option | Default | Description |
| --- | --- | --- |
| Include Other Input Fields | off | Passes the input item's fields and files through. Applies to *Run Once for Each Item* with *Text* or *File* output. |
| Line Endings | Keep As Is | Converts all line breaks to Unix (LF), Windows (CRLF) or carriage return only (CR, used by HL7). |

## Output formats in detail

### Text

The rendered string is written to one field:

```json
{ "message": "Hello Ann, your order A1 has shipped." }
```

### JSON

The rendered string is parsed and becomes the output item. A JSON **array** produces one output item per element, and a primitive value is wrapped as `{ "data": value }`. If parsing fails, the error tells you what went wrong and how to fix it.

Strict JSON is tried first. If that fails, the node also accepts JavaScript object literals, such as data copied from the n8n output panel or a `console.log`: unquoted keys, single-quoted strings, trailing commas and comments. Nothing is evaluated, so only plain data is accepted. Values from expressions should still go through `JSON.stringify` so they are escaped correctly.

### XML

The rendered string is parsed and converted to structured data you can browse and drag fields from in the output panel, just like JSON. It uses the same `$` (attributes) and `_` (text) keys as n8n's built-in XML node:

```xml
<order id="A1">
  <customer>Ann</customer>
  <total currency="EUR">10.50</total>
  <item>Pen</item>
  <item>Paper</item>
</order>
```

becomes

```json
{
  "order": {
    "$": { "id": "A1" },
    "customer": "Ann",
    "total": { "$": { "currency": "EUR" }, "_": "10.50" },
    "item": ["Pen", "Paper"]
  }
}
```

so later nodes can use `{{ $json.order.customer }}`, `{{ $json.order.total._ }}` or `{{ $json.order.$.id }}`.

The parser supports attributes, CDATA, comments, processing instructions, the XML declaration, DOCTYPE, namespaced names (kept as-is, e.g. `soap:Envelope`) and standard and numeric entities. Invalid XML fails with the line and column of the problem. All values are strings, as in the XML node.

### File

The rendered string is stored as a binary file, ready for **Write Files to Disk**, **Send Email** attachments, FTP, S3 and so on.

## Examples


<img width="1337" height="417" alt="image" src="https://github.com/user-attachments/assets/d974ce42-1471-4d58-a3ea-5f71a0b4f448" />

<img width="964" height="670" alt="image" src="https://github.com/user-attachments/assets/2dea2966-7939-45d6-be76-25ac8cf07ce4" />


### API request body per item

Output Format **JSON**:

```
{
  "orderId": {{ JSON.stringify($json.id) }},
  "customer": {{ JSON.stringify($json.name) }},
  "amount": {{ $json.total }},
  "sentAt": {{ JSON.stringify($now.toISO()) }}
}
```

### One JSON array from all items

Mode **Combine All Items**, Header `[`, Separator `,`, Footer `]`, Output Format **JSON**, Template:

```
{{ JSON.stringify({ id: $json.id, total: $json.total }) }}
```

### One XML document from all items

Mode **Combine All Items**, Header `<orders>`, Separator empty, Footer `</orders>`, Output Format **XML**, Template:

```
<order id="{{ $json.id }}"><total>{{ $json.total }}</total></order>
```

Output: `{ "orders": { "order": [ { "$": { "id": "A1" }, "total": "10.5" }, … ] } }`. Turn on **Always Use Arrays** if a run can contain a single order and you need `order` to always be an array.

### SOAP envelope

Output Format **XML**, XML Options → Add Formatted XML Field `xml`, then send `{{ $json.xml }}` as the body of an HTTP Request node:

```
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCustomer><Id>{{ $json.id }}</Id></GetCustomer>
  </soap:Body>
</soap:Envelope>
```

### CSV file

Mode **Combine All Items**, Header `id,name,total` followed by a new line, Separator a new line, Output Format **File**, File Name `orders.csv`, MIME Type `text/csv`, Options → Line Endings **Windows (CRLF)**, Template:

```
{{ $json.id }},{{ JSON.stringify($json.name) }},{{ $json.total }}
```

### HL7 message

Output Format **Text**, Options → Line Endings **Carriage Return Only (CR)**, Template with one segment per line:

```
MSH|^~\&|APP|FAC|RECV|RFAC|{{ $now.toFormat('yyyyMMddHHmmss') }}||ADT^A08|{{ $json.id }}|P|2.4
PID|1||{{ $json.mrn }}||{{ $json.lastName }}^{{ $json.firstName }}
```

## Tips

- **Escape values for the format you are building.** In JSON use `{{ JSON.stringify($json.field) }}`, which adds quotes and escapes special characters. In XML replace `&` and `<`, e.g. `{{ $json.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;') }}`.
- **Expressions that return objects** are converted to JSON text automatically.
- **Combine mode** reads Header, Separator, Footer and the options from the first item.
- Turn on **Settings → On Error → Continue** to output failed items as `{ "error": "…" }` instead of stopping the workflow.

## Security

- **No runtime dependencies**: the package is only the compiled node.
- **Safe XML parsing**: DTDs and entity declarations are ignored (no XXE, no entity expansion), and nesting deeper than 1,000 levels is rejected.
- **No prototype pollution**: names such as `__proto__` in XML or JSON are plain data.
- **No code execution**: lenient JSON is parsed by a small hand-written parser, never evaluated. Template expressions are evaluated by n8n itself.

## Compatibility

- n8n 1.x and 2.x (Nodes API version 1)
- Node.js 20.15 or newer for development

## Development

```bash
git clone https://github.com/SilentJMA/n8n-nodes-message-template.git
cd n8n-nodes-message-template
npm install --ignore-scripts
npm run dev     # local n8n at http://localhost:5678 with the node loaded
npm run lint
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project layout and release process, and [CHANGELOG.md](CHANGELOG.md) for version history.

## License

[MIT](LICENSE)
