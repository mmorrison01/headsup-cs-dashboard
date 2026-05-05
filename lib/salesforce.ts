import { Connection } from "jsforce";

const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL ?? "https://headsuphealth.my.salesforce.com";
const SF_USERNAME = process.env.SF_USERNAME ?? "";
const SF_PASSWORD = process.env.SF_PASSWORD ?? "";
const SF_SECURITY_TOKEN = process.env.SF_SECURITY_TOKEN ?? "";

let _conn: Connection | null = null;
let _connExpiresAt = 0;

export async function getSalesforceConnection(): Promise<Connection> {
  if (_conn && Date.now() < _connExpiresAt) return _conn;

  const conn = new Connection({ instanceUrl: SF_INSTANCE_URL, version: "60.0" });
  await conn.login(SF_USERNAME, SF_PASSWORD + SF_SECURITY_TOKEN);
  _conn = conn;
  _connExpiresAt = Date.now() + 110 * 60 * 1000; // re-auth after ~2 hours
  return conn;
}

export function isSalesforceConfigured(): boolean {
  return !!(SF_USERNAME && SF_PASSWORD && SF_SECURITY_TOKEN);
}
