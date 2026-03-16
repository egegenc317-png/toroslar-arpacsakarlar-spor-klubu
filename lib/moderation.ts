export function isModeratorRole(role?: string | null) {
  return role === "ADMIN" || role === "MODERATOR";
}

