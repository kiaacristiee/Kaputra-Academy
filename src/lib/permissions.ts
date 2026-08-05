export function canManageEnrollment(
  userRole?: string | null,
  learningMethod?: string | null
): boolean {
  if (!userRole) return false;

  const normalizedRole = userRole.toUpperCase();

  // Super admins, owners, and co-owners have full permission for all learning methods
  if (["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalizedRole)) {
    return true;
  }

  // Standard admin role is allowed for Semi-Private classes
  if (normalizedRole === "ADMIN") {
    // If learningMethod is SEMI_PRIVATE or Semi-Private
    if (!learningMethod) return true; // Default fallback if unspecified
    const method = learningMethod.toUpperCase().replace("-", "_");
    return method === "SEMI_PRIVATE";
  }

  return false;
}

export function isAdminRole(userRole?: string | null): boolean {
  if (!userRole) return false;
  const normalized = userRole.toUpperCase();
  return ["ADMIN", "SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalized);
}

// Determines if an admin model is authorized to manage strictly private classes & payments
export function canManagePrivateClasses(userRole?: string | null): boolean {
  if (!userRole) return false;
  const normalized = userRole.toUpperCase();
  // Standard ADMIN is locked out of this.
  return ["SUPER_ADMIN", "OWNER", "CO_OWNER"].includes(normalized);
}

