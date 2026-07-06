import type { ContactInput } from "./types";

function unfoldVcardLines(raw: string): string[] {
  const lines: string[] = [];
  for (const part of raw.split(/\r?\n/)) {
    if (!part.trim()) continue;
    if (lines.length > 0 && /^[\s]/.test(part)) {
      lines[lines.length - 1] += part.trimStart();
    } else {
      lines.push(part);
    }
  }
  return lines;
}

function parseVcardField(line: string): { key: string; value: string } | null {
  const match = line.match(/^([^:;]+)(?:;[^:]*)?:(.*)$/);
  if (!match) return null;
  return { key: match[1].toUpperCase(), value: match[2].trim() };
}

/** Minimal vCard 3/4 parser — enough for common exports from Apple/Google. */
export function parseVcard(text: string): ContactInput[] {
  const blocks = text.split(/BEGIN:VCARD/i).slice(1);
  const results: ContactInput[] = [];

  for (const block of blocks) {
    const lines = unfoldVcardLines(block);
    let name = "";
    let phone = "";
    let phoneLabel: string | undefined;
    let email: string | undefined;
    let company: string | undefined;
    let title: string | undefined;

    for (const line of lines) {
      if (/^END:VCARD/i.test(line)) break;
      const field = parseVcardField(line);
      if (!field) continue;

      switch (field.key) {
        case "FN":
          name = field.value;
          break;
        case "N": {
          if (!name) {
            const parts = field.value.split(";").filter(Boolean);
            name = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
          }
          break;
        }
        case "TEL":
          if (!phone) {
            phone = field.value.replace(/^tel:/i, "");
            const typeMatch = line.match(/TYPE=([^;:]+)/i);
            phoneLabel = typeMatch?.[1]?.replace(/"/g, "");
          }
          break;
        case "EMAIL":
          if (!email) email = field.value.replace(/^mailto:/i, "");
          break;
        case "ORG":
          company = field.value.split(";")[0]?.trim();
          break;
        case "TITLE":
          title = field.value;
          break;
        default:
          break;
      }
    }

    if (name.trim() && (phone.trim() || email?.trim())) {
      results.push({
        name: name.trim(),
        phone: phone.trim() || "—",
        phoneLabel,
        email: email?.trim() || undefined,
        company,
        title,
      });
    }
  }

  return results;
}

function splitCsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** CSV with a header row (name, phone, email, …) or two-column name,phone fallback. */
export function parseContactsCsv(text: string): ContactInput[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];

  const headerCells = splitCsvRow(rows[0]).map(normalizeHeader);
  const hasHeader = headerCells.some((cell) =>
    ["name", "fullname", "displayname", "phone", "email", "company", "title"].includes(cell),
  );

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const results: ContactInput[] = [];

  for (const row of dataRows) {
    const cells = splitCsvRow(row);
    if (cells.every((cell) => !cell)) continue;

    if (hasHeader) {
      const pick = (...keys: string[]) => {
        for (const key of keys) {
          const index = headerCells.indexOf(key);
          if (index >= 0 && cells[index]) return cells[index];
        }
        return undefined;
      };
      const name = pick("name", "fullname", "displayname");
      const phone = pick("phone", "mobile", "telephone", "tel");
      const email = pick("email", "mail");
      if (!name?.trim()) continue;
      results.push({
        name: name.trim(),
        phone: phone?.trim() || "—",
        phoneLabel: pick("phonelabel", "label"),
        email: email?.trim() || undefined,
        company: pick("company", "organization", "org"),
        title: pick("title", "jobtitle"),
        favorite: pick("favorite", "starred")?.toLowerCase() === "true",
      });
      continue;
    }

    const [name, phone, email, company, title] = cells;
    if (!name?.trim()) continue;
    results.push({
      name: name.trim(),
      phone: phone?.trim() || "—",
      email: email?.trim() || undefined,
      company: company?.trim() || undefined,
      title: title?.trim() || undefined,
    });
  }

  return results;
}

export function parseContactsFile(name: string, text: string): ContactInput[] {
  const lower = name.toLowerCase();
  if (lower.endsWith(".vcf") || lower.endsWith(".vcard") || text.includes("BEGIN:VCARD")) {
    return parseVcard(text);
  }
  return parseContactsCsv(text);
}
