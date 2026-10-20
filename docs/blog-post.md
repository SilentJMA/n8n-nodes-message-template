# Stop Calling the Real API: Build and Test n8n Workflows with Message Template

Every n8n developer knows the loop. You are building a workflow that starts with a webhook, a SOAP service, an SFTP drop or a vendor API. To test the next node, you have to run the first one again. Every tweak means another call, another file download, another 4 MB response parsed in the editor, and sometimes another rate-limit warning or a record that was only supposed to be processed once.

There is a better way to work: **replace the source with a message you control**. The [Message Template](https://github.com/SilentJMA/n8n-nodes-message-template) community node does exactly that, and it turns out to be a handy development tool as well as a production one.

## What it does

Message Template renders content from an n8n expression template and outputs it as **text, JSON, XML or a file**, once per item or combined across all items. You write the content in the Template field, mix in expressions like `{{ $json.name }}`, and pick the output format. The node parses it into real structured data, so everything downstream behaves as if it came from the real source.

That is the whole trick: the node can *pretend to be your source*.

## The problem with testing against the real thing

When you develop against live sources, a few things go wrong over time:

- **Heavy payloads slow the editor.** A large JSON response or XML export makes the output panel sluggish, and every re-run pays that cost again.
- **Slow and flaky upstreams.** You wait on the network for data you have already seen twenty times.
- **Side effects and limits.** Some APIs count calls against a quota, trigger notifications, or return different data on the second request.
- **Files are awkward.** Re-downloading or re-reading a file on every test run is tedious, and sensitive files should not be sitting in your workflow history at all.
- **Edge cases are hard to get.** You cannot ask a production system for "an order with a single item and an ampersand in the customer name".

## The approach: a small, hand-written sample

Paste a **trimmed-down sample** of the payload into a Message Template node, set the output format, and connect it where the real source node would go. You keep the shape of the data and drop the weight.

Say your workflow normally receives a large XML order export. In development, use this instead (Output Format **XML**):

```xml
<orders>
  <order id="A1">
    <customer>Ann</customer>
    <total currency="EUR">10.50</total>
    <item>Pen</item>
    <item>Paper</item>
  </order>
</orders>
```

The node parses it into the same structure the XML node would give you, with attributes under `$` and text under `_`, so later nodes can use `{{ $json.orders.order.customer }}` and `{{ $json.orders.order.total._ }}` right away. No file, no HTTP call, no 4 MB response.

The same works for the other formats:

- **JSON:** write the response body as JSON. If it is an array, you get one item per element, just like a real list endpoint.
- **Text:** mock a plain message, a log line or an HL7 segment (it can even convert line endings to CR for HL7).
- **File:** produce a small CSV or text file as binary data, ready for nodes that expect an attachment, without ever touching the disk or an FTP server.

## Make the sample dynamic

Because the template accepts expressions, your mock does not have to be static. Feed it a handful of input items and generate one message per item:

```
{
  "orderId": {{ JSON.stringify($json.id) }},
  "customer": {{ JSON.stringify($json.name) }},
  "amount": {{ $json.total }},
  "sentAt": {{ JSON.stringify($now.toISO()) }}
}
```

Or switch to **Combine All Items** mode with a header, separator and footer to assemble a single document, such as one XML file holding several orders. A few input items give you a realistic multi-record payload that you wrote yourself and fully understand.

## Test the ugly cases on purpose

This is where a hand-written source beats a live one. You can create exactly the inputs that break workflows:

- A single `<item>` where you normally get a list. (Turn on **Always Use Arrays** to see the difference.)
- A name containing `&`, a quote or a line break.
- An empty field, a missing field, a very long string.
- Invalid XML or JSON, to confirm your error path works. The node reports the line and column of XML problems and gives escaping hints for JSON.

Combined with **Settings → On Error → Continue**, failed items come out as `{ "error": "…" }`, so you can check how the rest of the workflow reacts without stopping the run.

## Why it helps day to day

| Instead of | You get |
| --- | --- |
| Calling the live API on every run | A message that is always the same and costs nothing |
| Loading a large payload into the editor | A small sample with the same structure |
| Reading or downloading a real file | A generated binary file with the name and MIME type you choose |
| Hoping production data has the edge case | An edge case written on demand |
| Sharing real customer data in screenshots and exports | Made-up data that is safe to share |

## Swapping the mock for the real thing

Keep the Message Template node in place of your trigger or source while you build. When the logic works, delete it and connect the real node. Because the output has the same shape, nothing downstream needs to change. If the real payload turns out to differ, update your sample and carry on.

Message Template is also useful in the finished workflow: building API request bodies, SOAP envelopes, emails, CSV exports and HL7 messages without a Code node. So the node you used to prototype may well stay.

## Try it

1. In n8n, open **Settings → Community Nodes → Install** and enter `n8n-nodes-message-template`.
2. Add a **Message Template** node, paste a small sample, and choose your output format.
3. Import `examples/message-template-examples.json` from the repository to see JSON, XML and CSV output side by side.

The project is MIT-licensed and open to issues and pull requests: [github.com/SilentJMA/n8n-nodes-message-template](https://github.com/SilentJMA/n8n-nodes-message-template).

Next time you catch yourself re-running a slow call just to test one expression, write the message yourself instead.
