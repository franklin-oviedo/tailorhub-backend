export enum Role {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  // Backward-compatible alias; prefer SUPER_ADMIN in new code.
  ADMIN = 'admin',
  CLIENT = 'client',
  EMPLOYEE = 'employee',
}
