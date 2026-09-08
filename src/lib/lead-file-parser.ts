import * as XLSX from 'xlsx';

export interface ParsedLeadRow {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  companyDomain?: string;
  domain?: string;
  address?: string;
  notes?: string;
  value?: number;
  source?: string;
  status?: string;
  region?: string;
}

export interface ParseResult {
  leads: ParsedLeadRow[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  fileType: string;
  warnings: string[];
}

/**
 * Downloads a sample Excel or CSV template for lead import
 */
export function downloadSampleTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = ['NAMES', 'NUMBER', 'ADDRESS', 'DOMAIN', 'REMARKS'];
  const sampleData = [
    ['Rajesh Kumar', '+91 98765 43210', 'FC Road, Central Pune', 'Home Loan', 'Interested in home loan for 3BHK flat'],
    ['Priya Sharma', '+91 91234 56789', 'Kharadi, East Pune', 'Education Loan', 'Looking for abroad study student loan'],
  ];

  if (format === 'csv') {
    const csvContent = [headers.join(','), ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lead_Import_Sample_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample Leads');
    XLSX.writeFile(wb, 'Lead_Import_Sample_Template.xlsx');
  }
}

/**
 * Normalizes phone numbers (removes spaces, dashes, country code prefix formatting)
 */
function normalizePhone(val: unknown): string {
  if (!val) return '';
  const str = String(val).trim();
  const digits = str.replace(/[^\d+]/g, '');
  return digits;
}

/**
 * Cleans string field values
 */
function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Checks if a string looks like a header or index number (e.g. "1", "2", "Sr. No.")
 */
function isNumericIndex(str: string): boolean {
  return /^\d{1,4}$/.test(str.trim());
}

/**
 * Normalizes keys to lowercase alphanumeric for fuzzy header matching
 */
function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Standardizes raw row object from Excel/CSV/JSON into a ParsedLeadRow
 */
function mapRowToLead(row: Record<string, unknown>): ParsedLeadRow | null {
  const normMap: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normMap[normalizeHeaderKey(k)] = v;
  }

  // Header candidates (ordered by priority)
  const nameKeys = ['name', 'names', 'fullnames', 'fullname', 'clientname', 'leadname', 'contactperson', 'customername', 'customer', 'person'];
  const phoneKeys = ['phone', 'phones', 'phonenumber', 'phonenumbers', 'mobile', 'mobiles', 'mobilenumber', 'contact', 'contacts', 'tel', 'cell', 'number', 'numbers'];
  const emailKeys = ['email', 'emails', 'emailaddress', 'mail', 'emailid'];
  const companyKeys = ['company', 'companyname', 'organization', 'org', 'business'];
  const domainKeys = ['domain', 'domains', 'category', 'industry', 'sector', 'businessdomain'];
  const addressKeys = ['address', 'addresses', 'location', 'city', 'region', 'area', 'place'];
  const notesKeys = ['notes', 'remarks', 'remark', 'comments', 'comment', 'description'];

  let name = '';
  let phone = '';
  let email = '';
  let company = '';
  let domain = '';
  let address = '';
  let notes = '';

  for (const key of nameKeys) {
    if (normMap[key]) { name = cleanString(normMap[key]); break; }
  }
  for (const key of phoneKeys) {
    if (normMap[key]) { phone = normalizePhone(normMap[key]); break; }
  }
  for (const key of emailKeys) {
    if (normMap[key]) { email = cleanString(normMap[key]); break; }
  }
  for (const key of companyKeys) {
    if (normMap[key]) { company = cleanString(normMap[key]); break; }
  }
  for (const key of domainKeys) {
    if (normMap[key]) { domain = cleanString(normMap[key]); break; }
  }
  for (const key of addressKeys) {
    if (normMap[key]) { address = cleanString(normMap[key]); break; }
  }
  for (const key of notesKeys) {
    if (normMap[key]) { notes = cleanString(normMap[key]); break; }
  }

  // Regex Fallbacks if direct header match wasn't found
  if (!name || isNumericIndex(name)) {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && /name/i.test(k) && !isNumericIndex(v)) {
        name = cleanString(v);
        break;
      }
    }
  }

  if (!phone) {
    for (const [k, v] of Object.entries(row)) {
      if (/(phone|mobile|number|contact)/i.test(k) && v) {
        phone = normalizePhone(v);
        if (phone.length >= 7) break;
      }
    }
  }

  if (!address) {
    for (const [k, v] of Object.entries(row)) {
      if (/(place|city|address|location|region|area)/i.test(k) && v) {
        address = cleanString(v);
        break;
      }
    }
  }

  if (!domain) {
    for (const [k, v] of Object.entries(row)) {
      if (/(domain|category|industry)/i.test(k) && v) {
        domain = cleanString(v);
        break;
      }
    }
  }

  if (!notes) {
    for (const [k, v] of Object.entries(row)) {
      if (/(remark|notes|comment)/i.test(k) && v) {
        notes = cleanString(v);
        break;
      }
    }
  }

  // Fallback: If no name column was mapped, search for the first non-numeric text column
  if (!name || isNumericIndex(name)) {
    for (const [k, v] of Object.entries(row)) {
      const strVal = cleanString(v);
      if (strVal && !isNumericIndex(strVal) && !/^\+?\d{7,15}$/.test(strVal) && !strVal.includes('@')) {
        name = strVal;
        break;
      }
    }
  }

  // Must have at least a Name or a Phone number to be a valid lead
  if (!name && !phone) return null;

  // Final sanity check on name
  if (!name && phone) {
    name = `Client (${phone.slice(-4)})`;
  }

  return {
    name,
    phone,
    email,
    company: company || domain || 'Individual',
    companyDomain: domain,
    domain,
    address,
    notes,
    region: address,
  };
}

/**
 * Text extractor for PDF/TXT/CSV raw unformatted text blocks
 */
function parseFreeformText(text: string, fileTypeLabel: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const leads: ParsedLeadRow[] = [];
  let skipped = 0;

  for (const line of lines) {
    // Look for phone numbers in line
    const phoneMatch = line.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    let phone = phoneMatch ? normalizePhone(phoneMatch[0]) : '';
    let email = emailMatch ? emailMatch[0] : '';

    // Extract potential name (words at the start of line before phone/email)
    let nameCandidate = line
      .replace(phoneMatch ? phoneMatch[0] : '', '')
      .replace(emailMatch ? emailMatch[0] : '', '')
      .replace(/[,\t|]/g, ' ')
      .trim();

    // Clean up extra spaces
    nameCandidate = nameCandidate.replace(/\s+/g, ' ');

    if (nameCandidate.length > 2 || phone || email) {
      leads.push({
        name: nameCandidate || (phone ? `Client (${phone.slice(-4)})` : 'Lead Contact'),
        phone,
        email,
        company: 'Extracted Lead',
        notes: line,
      });
    } else {
      skipped++;
    }
  }

  return {
    leads,
    totalRows: lines.length,
    validRows: leads.length,
    skippedRows: skipped,
    fileType: fileTypeLabel,
    warnings: leads.length === 0 ? ['No structured lead contacts could be extracted from text.'] : [],
  };
}

/**
 * Excel (.xlsx, .xls) parser
 */
async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  const leads: ParsedLeadRow[] = [];
  let skipped = 0;

  for (const row of rawRows) {
    const lead = mapRowToLead(row);
    if (lead) {
      leads.push(lead);
    } else {
      skipped++;
    }
  }

  return {
    leads,
    totalRows: rawRows.length,
    validRows: leads.length,
    skippedRows: skipped,
    fileType: 'Excel Spreadsheet (.xlsx / .xls)',
    warnings: [],
  };
}

/**
 * CSV (.csv) parser
 */
async function parseCSVFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      leads: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      fileType: 'CSV File (.csv)',
      warnings: ['File is empty.'],
    };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const rawRows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    rawRows.push(rowObj);
  }

  const leads: ParsedLeadRow[] = [];
  let skipped = 0;

  for (const row of rawRows) {
    const lead = mapRowToLead(row);
    if (lead) {
      leads.push(lead);
    } else {
      skipped++;
    }
  }

  return {
    leads,
    totalRows: rawRows.length,
    validRows: leads.length,
    skippedRows: skipped,
    fileType: 'CSV File (.csv)',
    warnings: [],
  };
}

/**
 * JSON (.json) parser
 */
async function parseJSONFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      leads: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      fileType: 'JSON File (.json)',
      warnings: ['Invalid JSON format.'],
    };
  }

  const rawArray = Array.isArray(json) ? json : [json];
  const leads: ParsedLeadRow[] = [];
  let skipped = 0;

  for (const item of rawArray) {
    if (typeof item === 'object' && item !== null) {
      const lead = mapRowToLead(item as Record<string, unknown>);
      if (lead) leads.push(lead);
      else skipped++;
    } else {
      skipped++;
    }
  }

  return {
    leads,
    totalRows: rawArray.length,
    validRows: leads.length,
    skippedRows: skipped,
    fileType: 'JSON File (.json)',
    warnings: [],
  };
}

/**
 * TXT (.txt) parser
 */
async function parseTextFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  return parseFreeformText(text, 'Text Document (.txt)');
}

/**
 * PDF parser
 */
async function parsePDFFile(file: File): Promise<ParseResult> {
  let text = '';
  try {
    const buffer = await file.arrayBuffer();
    const pdfModule: any = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const data = await pdfParse(Buffer.from(buffer));
    text = data.text || '';
  } catch (err) {
    text = await file.text();
  }

  return parseFreeformText(text, 'PDF Document (.pdf)');
}

/**
 * Master parser router dispatching to correct parser by extension/mime-type
 */
export async function parseLeadFile(file: File): Promise<ParseResult> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    return parseExcelFile(file);
  }
  if (filename.endsWith('.csv')) {
    return parseCSVFile(file);
  }
  if (filename.endsWith('.json')) {
    return parseJSONFile(file);
  }
  if (filename.endsWith('.pdf')) {
    return parsePDFFile(file);
  }
  if (filename.endsWith('.txt')) {
    return parseTextFile(file);
  }

  // Default fallback
  return parseExcelFile(file);
}
