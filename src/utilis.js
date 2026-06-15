// Format a number as Kenyan Shillings 
// toLocaleString adds commas: 2500 → "2,500.00"

export function fmt(amount) {
  return "KSh " + Math.abs(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Get initials from a full name ────────────────────────────────────────
// "Jane Wanjiku" → "JW"
// split(' ')  → ["Jane", "Wanjiku"]
// .map(w => w[0]) → ["J", "W"]
// .join('')   → "JW"
// .slice(0,2) → keeps max 2 characters
export function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Parse M-Pesa CSV statement 
export function parseMpesaCSV(text) {
  const lines = text
    .split("\n")           // split the whole file into individual lines
    .map((l) => l.trim())  // remove whitespace/newlines at edges
    .filter(Boolean);      // remove empty lines

  // Words that appear in header rows or metadata — we skip these lines
  const SKIP = ["date", "receipt", "transaction", "narration", "balance", "m-pesa", "safaricom", "statement", "-----"];

  const transactions = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Skip header / metadata lines
    if (SKIP.some((word) => lower.includes(word))) continue;

    // Split by comma, strip surrounding quotes that CSV sometimes adds
    const parts = line.split(",").map((p) => p.replace(/"/g, "").trim());

    // We need at least 3 columns to do anything useful
    if (parts.length < 3) continue;

    // ── Find the description column 
    // It's the longest text column that isn't a number
    const desc = parts.find(
      (p) => p.length > 10 && isNaN(parseFloat(p.replace(/,/g, "")))
    ) || "";

    // ── Find the date column 
    // Matches formats like: 05/Jan/2024   2024-01-05   05/01/24
    const date = parts.find((p) =>
      /^\d{1,2}[\/-]\w{3,9}[\/-]\d{2,4}/.test(p) ||
      /^\d{4}-\d{2}-\d{2}/.test(p)
    ) || "";

    // ── Extract numeric values ───────────────────────────────────────────
    // parseFloat(p.replace(/,/g, '')) handles values like "2,500.00"
    const numbers = parts
      .map((p) => parseFloat(p.replace(/,/g, "")))
      .filter((n) => !isNaN(n) && n > 0);

    if (!numbers.length) continue;

    // In a standard M-Pesa CSV: [paidIn, withdrawn, balance] or just [amount, balance]
    const amount = numbers[0] || 0;
    const balance = numbers[numbers.length - 1] || 0;

    // ── Determine direction 
    // "received from" or "credited" → money came IN
    const type = /received from|credited/i.test(desc) ? "received" : "sent";

    // ── Extract contact name ─────────────────────────────────────────────
    // Looks for pattern: "Send Money to JANE WANJIKU 0712..." or "Received from JOHN KAMAU"
    // The regex captures the name between the keyword and the phone number
    const nameMatch = desc.match(
      /(?:send money to|received from|from|to)\s+([A-Z][A-Z\s]+?)(?:\s+07\d{8}|\s+-|\s*$)/i
    );

    // ── Extract phone number 
    
    const phoneMatch = desc.match(/07\d{8}/);

    // Only keep the transaction if we found a contact
    if (!nameMatch && !phoneMatch) continue;

    // Capitalise each word: "JANE WANJIKU" → "Jane Wanjiku"
    const rawName = nameMatch ? nameMatch[1].trim() : "Unknown";
    const name = rawName
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    transactions.push({
      date,
      desc,
      // Sent = negative, Received = positive (makes net math easy)
      amount: type === "sent" ? -Math.abs(amount) : Math.abs(amount),
      balance,
      type,
      name,
      phone: phoneMatch ? phoneMatch[0] : "",
    });
  }

  return transactions;
}


//unique list of people from all transactions 
// Groups transactions by name, sums up sent and received totals
export function buildPeopleMap(transactions) {
  const map = {};

  for (const t of transactions) {
    const key = t.name + "|" + t.phone; // unique key per person

    if (!map[key]) {
      map[key] = { name: t.name, phone: t.phone, count: 0, sent: 0, received: 0 };
    }

    map[key].count++;
    if (t.type === "sent") map[key].sent += Math.abs(t.amount);
    else                   map[key].received += Math.abs(t.amount);
  }

  // Convert the object into an array and sort by most transactions first
  return Object.values(map).sort((a, b) => b.count - a.count);
}