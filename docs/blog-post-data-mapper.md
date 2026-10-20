# Map Data in n8n Without Writing Code: Meet the Data Mapper Node

Almost every integration ends up with the same chore: the data you receive does not look like the data you need to send.

The shop's API calls it `customer.name`, your ERP wants `buyer.name`. One system sends quantities as text, the other wants numbers. A supplier sends XML, your database wants JSON. The country is `NL` in one place and `Netherlands` in another.

In n8n this usually means a Code node, a pile of Set nodes, or a long chain of expressions. It works, but it is hard to read, hard to hand over, and out of reach for the colleague who knows the data best but does not write JavaScript.

The [Data Mapper](https://github.com/SilentJMA/n8n-nodes-data-mapper) community node moves that work into one node with a form instead of a script.

## What it does

Data Mapper maps data from one structure to another. In a single node you can:

- rename fields and nest them under new parents,
- map whole arrays with a `[*]` wildcard,
- convert types, format dates and translate codes with lookup tables,
- read JSON or XML in, and write JSON or XML (text or file) out.

## Why non-coders can use it

**You fill in a table, not a script.** Each mapping is a row: a source, a target and an optional transform. Take this input:

```json
{
  "id": "A1",
  "customer": { "name": "  Ann ", "country": "NL" },
  "items": [
    { "sku": "P-1", "qty": "2" },
    { "sku": "P-2", "qty": "1" }
  ]
}
```

| Source | Target | Transform |
| --- | --- | --- |
| `id` | `orderId` | |
| `customer.name` | `buyer.name` | Trim |
| `customer.country` | `buyer.country` | Lookup Table: `NL=Netherlands` |
| `items[*].sku` | `lines[*].productCode` | |
| `items[*].qty` | `lines[*].quantity` | To Integer |
| Fixed value `EUR` | `lines[*].currency` | |

Result:

```json
{
  "orderId": "A1",
  "buyer": { "name": "Ann", "country": "Netherlands" },
  "lines": [
    { "productCode": "P-1", "quantity": 2, "currency": "EUR" },
    { "productCode": "P-2", "quantity": 1, "currency": "EUR" }
  ]
}
```

Notice what is missing: no loops, no `map()`, no `parseInt`. Transforms are chosen from a list (Trim, To Integer, Round, Format Date, Split, Join, Lookup Table and more).

**Pick the target from a dropdown.** If you have a description of the structure you must deliver, paste it or upload it as a *target profile*. Data Mapper reads JSON Schema, sample JSON, sample XML, XSD, a CSV header, or an integration profile exported as XML, JSON or flat file. Then you choose each target field from a dropdown instead of typing paths and hoping you spelled them right.

**Let auto-map do the first pass.** With a target profile loaded, *Auto-Map From Profile* matches your source fields to the target fields by name and applies the right transform from the field type (a number field gets *To Number*, a date field gets *Format Date*). You can tune how strict it is: minimum confidence, fuzzy or exact matching, case sensitivity, and what to do with fields that find no match. Turn on the match report and you get a list of what matched and what did not.

Prefer a mix? Map the tricky fields by hand and switch on *Auto-Map Remaining Target Fields*. Your manual mappings win and the rest is filled in.

**Plain-language errors.** When something does not fit, the error names the mapping, for example `Mapping 3 (→ lines[*].quantity): Cannot convert "two" to a number`. You do not have to debug a stack trace. With *On Error → Continue*, failed items come out as `{ "error": "…" }` instead of stopping the run.

## Why it is efficient

**One node instead of many.** A mapping that would be a Code node plus several Set nodes becomes a single, readable table. Anyone opening the workflow can see at a glance what goes where.

**Arrays are handled for you.** Mapping a list of order lines to a differently shaped list is one row with `[*]` on both sides. Mappings that fill the same target array build it up together, so you can create a list of objects from several source fields.

**Missing data has a policy.** Each mapping chooses what happens when the source is absent: leave the field out, set it to null, use a default, or stop with an error. That removes a whole category of "undefined" surprises.

**XML and JSON in one place.** Feed it an XML file, get clean JSON out. Or the other way round, with a root element and XML declaration if you need them. No separate conversion node in the middle.

**Reuse across workflows.** Set *Define Mappings* to *Using JSON* and the mapping becomes data. Keep it in a database row, a file or a static data node, and load it with an expression, so many workflows share one definition and an update happens in one place. Unknown properties are rejected, so a typo like `"tranform"` fails loudly instead of being silently ignored.

**Keep or drop the rest.** *Unmapped Fields* decides whether the output contains only what you mapped, or a copy of the input with your mappings applied on top. Dropping is handy for pulling the few useful parts out of a large payload.

## A realistic use

Imagine a supplier sends an XML order file every morning. Your team has a JSON schema for the system that receives orders.

1. A trigger or file node supplies the XML file.
2. Data Mapper reads it (input type *File*, format detected automatically).
3. Paste the receiving schema as the target profile and run *Auto-Map From Profile*.
4. Fix the two or three fields that need a lookup table or a date format.
5. Send the JSON on to the next system.

The person who knows what "status code 3" means can build and maintain this. No developer has to be involved after the setup.

## Be realistic about the limits

Data Mapper is for reshaping and converting data. The path syntax (`customer.name`, `items[*].sku`) takes a few minutes to learn, and for logic that goes beyond the built-in transforms you can use a *Fixed Value* with an n8n expression such as `{{ $json.first + ' ' + $json.last }}`. If your transformation really is a program, a Code node is still the right tool.

## Try it

1. In n8n open **Settings → Community Nodes → Install** and enter `n8n-nodes-data-mapper`.
2. Add a **Data Mapper** node after any node that outputs items.
3. Import `examples/data-mapper-examples.json` from the repository to try the order example above and the XML examples.

Data Mapper is MIT-licensed and open to issues and pull requests: [github.com/SilentJMA/n8n-nodes-data-mapper](https://github.com/SilentJMA/n8n-nodes-data-mapper).

If your workflows are full of Set nodes and one-off scripts just to rename fields, this is the node to replace them with.
