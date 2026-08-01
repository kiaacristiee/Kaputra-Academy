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
