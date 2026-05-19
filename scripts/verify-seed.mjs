const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    const [key, inline] = arg.slice(2).split("=");
    args.set(key, inline ?? process.argv[i + 1] ?? "true");
    if (inline === undefined && process.argv[i + 1]?.startsWith("--") === false) {
      i += 1;
    }
  }
}

const baseUrl =
  args.get("base-url") || "http://localhost:4004/odata/v4/warehouse";
const token = args.get("token") || process.env.SAP_BEARER_TOKEN;
const write = args.has("write");

const headers = { Accept: "application/json" };
if (token) {
  headers.Authorization = `Bearer ${token}`;
} else if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
  headers.Authorization = `Basic ${Buffer.from("admin:admin").toString("base64")}`;
}

const expected = {
  Products: 6,
  StockLevels: 6,
  Suppliers: 4,
  Invoices: 4,
  InvoiceItems: 4,
  PurchaseOrders: 3,
  A_BusinessPartner: 5,
  A_BusinessPartnerAddress: 5,
  A_BusinessPartnerRole: 5,
};

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${path} -> HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return body;
}

let failed = false;
function ok(message) {
  console.log(`OK   ${message}`);
}
function fail(message, error) {
  failed = true;
  console.log(`FAIL ${message}: ${error.message || error}`);
}

for (const [name, minCount] of Object.entries(expected)) {
  try {
    const data = await request(`/${name}`);
    const count = Array.isArray(data.value) ? data.value.length : 0;
    if (count < minCount) {
      throw new Error(`${count} rows, expected at least ${minCount}`);
    }
    ok(`${name}: ${count}`);
  } catch (error) {
    fail(name, error);
  }
}

try {
  const metadata = await request("/$metadata", {
    headers: { Accept: "application/xml" },
  });
  const xml = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
  for (const marker of [
    "Products",
    "StockLevels",
    "Invoices",
    "InvoiceItems",
    "A_BusinessPartner",
    "A_BusinessPartnerAddress",
    "A_BusinessPartnerRole",
    "to_BusinessPartnerAddress",
    "OrganizationBPName1",
    "PostInvoice",
  ]) {
    if (!xml.includes(marker)) {
      throw new Error(`metadata is missing ${marker}`);
    }
  }
  ok("$metadata contains Axon demo entity sets and BP navigation");
} catch (error) {
  fail("$metadata", error);
}

try {
  const data = await request(
    "/StockLevels?$filter=contains(Name,'Arabica')&$select=Name,Quantity,Unit,warehouseLocation",
  );
  const row = data.value?.[0];
  if (!row || row.Quantity !== 420 || row.Unit !== "kg") {
    throw new Error(`unexpected Arabica stock row: ${JSON.stringify(row)}`);
  }
  ok("Arabica stock query returns 420 kg");
} catch (error) {
  fail("Arabica stock query", error);
}

try {
  const data = await request(
    "/Products?$filter=contains(Name,'ABC%20GmbH')&$select=Name,Sku,Price,Unit",
  );
  const row = data.value?.[0];
  if (!row || !String(row.Name).includes("ABC GmbH")) {
    throw new Error(`unexpected ABC GmbH product row: ${JSON.stringify(row)}`);
  }
  ok("Products supplier/name query returns ABC GmbH demo product");
} catch (error) {
  fail("ABC GmbH product query", error);
}

try {
  const data = await request(
    "/A_BusinessPartner('1000001')/to_BusinessPartnerAddress",
  );
  if (!Array.isArray(data.value) || data.value.length === 0) {
    throw new Error("BP 1000001 has no address rows");
  }
  ok("BP navigation to_BusinessPartnerAddress works");
} catch (error) {
  fail("BP address navigation", error);
}

if (write) {
  try {
    const payload = {
      CustomerName: "ABC GmbH",
      Comment: "Axon photo invoice smoke test",
      IdempotencyKey: `verify-${Date.now()}`,
      Items: [
        {
          ProductName: "AX-2025-01 Arabica Premium 1kg",
          Quantity: 154,
          Price: 25,
        },
      ],
    };
    const data = await request("/Invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!data.ID || Number(data.Total) !== 3850) {
      throw new Error(`unexpected invoice create response: ${JSON.stringify(data)}`);
    }
    ok("Axon photo-invoice payload creates Invoice with Total 3850");
  } catch (error) {
    fail("Invoice create write smoke", error);
  }
}

if (failed) {
  process.exit(1);
}
