import { Connection } from "jsforce";

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL ?? "https://headsuphealth.my.salesforce.com";
const SF_ACCESS_TOKEN = process.env.SF_ACCESS_TOKEN ?? "";
const SF_USERNAME = process.env.SF_USERNAME ?? "";
const SF_PASSWORD = process.env.SF_PASSWORD ?? "";
const SF_SECURITY_TOKEN = process.env.SF_SECURITY_TOKEN ?? "";

let _conn: Connection | null = null;
let _connExpiresAt = 0;

export async function getSalesforceConnection(): Promise<Connection> {
  if (_conn && Date.now() < _connExpiresAt) return _conn;

  let conn: Connection;

  if (SF_ACCESS_TOKEN) {
    // OAuth session token from SF CLI — no login round-trip needed
    conn = new Connection({ instanceUrl: SF_INSTANCE_URL, accessToken: SF_ACCESS_TOKEN, version: "60.0" });
    _connExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
  } else {
    // Username + password + security token fallback
    conn = new Connection({ instanceUrl: SF_INSTANCE_URL, version: "60.0" });
    await conn.login(SF_USERNAME, SF_PASSWORD + SF_SECURITY_TOKEN);
    _connExpiresAt = Date.now() + 110 * 60 * 1000;
  }

  _conn = conn;
  return conn;
}

export function isSalesforceConfigured(): boolean {
  return !!(SF_ACCESS_TOKEN || (SF_USERNAME && SF_PASSWORD && SF_SECURITY_TOKEN));
}
