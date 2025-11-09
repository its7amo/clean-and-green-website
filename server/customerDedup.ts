import { Pool } from 'pg';

export interface CustomerMatchResult {
  matchFound: boolean;
  customerId?: string;
  matchType?: 'email' | 'phone' | 'address' | 'multiple';
  matchedFields?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export async function findMatchingCustomer(
  pool: Pool,
  email?: string | null,
  phone?: string | null,
  address?: string | null
): Promise<CustomerMatchResult> {
  // Handle empty/null values
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedAddress = address ? normalizeAddress(address) : null;

  // Build dynamic query based on available fields
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (normalizedEmail) {
    conditions.push(`LOWER(TRIM(email)) = $${paramIndex}`);
    params.push(normalizedEmail);
    paramIndex++;
  }

  if (normalizedPhone) {
    conditions.push(`REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $${paramIndex}`);
    params.push(normalizedPhone);
    paramIndex++;
  }

  if (normalizedAddress) {
    conditions.push(`LOWER(TRIM(REGEXP_REPLACE(COALESCE(address, ''), '[^a-zA-Z0-9]', '', 'g'))) = $${paramIndex}`);
    params.push(normalizedAddress);
    paramIndex++;
  }

  // No valid fields to match
  if (conditions.length === 0) {
    return { matchFound: false, confidence: 'low' };
  }

  const query = `
    SELECT id, email, phone, address
    FROM customers
    WHERE ${conditions.join(' OR ')}
    LIMIT 1
  `;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return { matchFound: false, confidence: 'low' };
  }

  const existingCustomer = result.rows[0];
  const matchedFields: string[] = [];

  // Check which fields matched
  if (normalizedEmail && existingCustomer.email?.toLowerCase().trim() === normalizedEmail) {
    matchedFields.push('email');
  }
  if (normalizedPhone && normalizePhone(existingCustomer.phone || '') === normalizedPhone) {
    matchedFields.push('phone');
  }
  if (normalizedAddress && normalizeAddress(existingCustomer.address || '') === normalizedAddress) {
    matchedFields.push('address');
  }

  // Determine match type and confidence
  let matchType: 'email' | 'phone' | 'address' | 'multiple' = 'email';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (matchedFields.length >= 2) {
    matchType = 'multiple';
    confidence = 'high';
  } else if (matchedFields.includes('email')) {
    matchType = 'email';
    confidence = 'high'; // Email is most reliable
  } else if (matchedFields.includes('phone')) {
    matchType = 'phone';
    confidence = 'medium';
  } else if (matchedFields.includes('address')) {
    matchType = 'address';
    confidence = 'medium';
  }

  return {
    matchFound: true,
    customerId: existingCustomer.id,
    matchType,
    matchedFields,
    confidence
  };
}

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export async function createMergeAlert(
  pool: Pool,
  matchType: string,
  matchedFields: string[],
  existingCustomerId: string,
  newCustomerData: {
    name: string;
    email: string;
    phone: string;
    address?: string | null;
  },
  sourceType: 'booking' | 'quote',
  sourceId: string,
  confidence: 'high' | 'medium' | 'low',
  triggeredBy?: string
): Promise<void> {
  // Check if similar alert exists in last 24 hours (deduplication)
  const existingAlert = await pool.query(
    `SELECT id FROM anomaly_alerts
     WHERE type = 'customer_duplicate'
       AND payload->>'existingCustomerId' = $1
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [existingCustomerId]
  );

  // Don't create duplicate alerts
  if (existingAlert.rows.length > 0) {
    return;
  }

  // Only create alerts for medium/high confidence matches
  if (confidence === 'low') {
    return;
  }

  const title = `Potential Customer Duplicate Detected`;
  const description = `A new ${sourceType} was created with customer information matching an existing customer on: ${matchedFields.join(', ')}. Confidence: ${confidence}`;
  
  const payload = {
    matchType,
    matchedFields,
    existingCustomerId,
    newCustomerData,
    sourceType,
    sourceId,
    confidence
  };

  await pool.query(
    `INSERT INTO anomaly_alerts (type, severity, title, description, payload, triggered_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      'customer_duplicate',
      confidence === 'high' ? 'medium' : 'low',
      title,
      description,
      JSON.stringify(payload),
      triggeredBy || null,
      'open'
    ]
  );
}
