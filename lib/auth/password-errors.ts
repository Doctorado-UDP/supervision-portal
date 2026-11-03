// Fixed messages for Supabase Auth password errors, so raw Auth text is never
// shown on the page.
export function describePasswordError(
  error: { code?: string | null } | null
) {
  switch (error?.code) {
    case "same_password":
      return "Choose a password that is different from your current one.";
    case "weak_password":
      return "Choose a stronger password: at least 10 characters, and avoid common or leaked passwords.";
    case "reauthentication_needed":
      return "Please sign in again before changing your password.";
    default:
      return "Your password could not be updated. Please try again.";
  }
}
