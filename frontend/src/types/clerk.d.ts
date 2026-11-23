export {};

// Custom claims added through Clerk's session token configuration:
// { "role": "{{org.role}}", "org_id": "{{org.id}}", "email": "{{user.primary_email_address}}" }
declare global {
  interface CustomJwtSessionClaims {
    role?: string;
    org_id?: string;
    email?: string;
  }
}
