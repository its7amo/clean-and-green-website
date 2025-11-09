import { Pool } from 'pg';

export interface CustomerMatchResult {
  matchFound: boolean;
  customerId?: string;
  matchType?: 'email' | 'phone' | 'address' | 'multiple';
  matchedFields?: string[];
}

export async function findMatchingCustomer(
  pool: Pool,
  email: string,
  phone: string,
  address: string
): Promise<CustomerMatchResult> {
  const normalizedAddress = normalizeAddress(address);
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email.toLowerCase().trim();

  const query = `
    SELECT id, email, phone, address
    FROM customers
    WHERE 
      LOWER(TRIM(email)) = $1
      OR phone = $2
      OR LOWER(TRIM(REGEXP_REPLACE(address, '[^a-zA-Z0-9]', '', 'g'))) = $3
    LIMIT 1
  `;

  const result = await pool.query(query, [normalizedEmail, normalizedPhone, normalizedAddress]);

  if (result.rows.length === 0) {
    return { matchFound: false };
  }

  const existingCustomer = result.rows[0];
  const matchedFields: string[] = [];
  let matchType: 'email' | 'phone' | 'address' | 'multiple' = 'email';

  if (existingCustomer.email.toLowerCase().trim() === normalizedEmail) {
    matchedFields.push('email');
  }
  if (existingCustomer.phone === normalizedPhone) {
    matchedFields.push('phone');
  }
  if (normalizeAddress(existingCustomer.address) === normalizedAddress) {
    matchedFields.push('address');
  }

  if (matchedFields.length > 1) {
    matchType = 'multiple';
  } else if (matchedFields.includes('phone')) {
    matchType = 'phone';
  } else if (matchedFields.includes('address')) {
    matchType = 'address';
  }

  return {
    matchFound: true,
    customerId: existingCustomer.id,
    matchType,
    matchedFields
  };
}

export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizePhone(phone: string): string {
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
    address: string;
  },
  sourceType: 'booking' | 'quote',
  sourceId: string,
  triggeredBy?: string
): Promise<void> {
  const title = `Potential Customer Duplicate Detected`;
  const description = `A new ${sourceType} was created with customer information matching an existing customer on: ${matchedFields.join(', ')}`;
  
  const payload = {
    matchType,
    matchedFields,
    existingCustomerId,
    newCustomerData,
    sourceType,
    sourceId
  };

  await pool.query(
    `INSERT INTO anomaly_alerts (type, severity, title, description, payload, triggered_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ['customer_duplicate', 'low', title, description, JSON.stringify(payload), triggeredBy || null, 'open']
  );
}
