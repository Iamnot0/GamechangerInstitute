export {};

// Custom claims added through Clerk's session token template:
// { "role": "{{user.public_metadata.role}}", "email": "{{user.primary_email_address}}" }
declare global {
  interface CustomJwtSessionClaims {
    role?: string;
    email?: string;
  }
}
