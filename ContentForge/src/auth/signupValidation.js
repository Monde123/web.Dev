/**
 * Pure signup validation (single responsibility: credential rules).
 * @param {{ email: string; password: string; passwordConfirm: string }} p
 * @returns {{ ok: true } | { ok: false; key: string }}
 */
export function validateSignup(p) {
  const email = (p.email || "").trim();
  const password = p.password ?? "";
  const passwordConfirm = p.passwordConfirm ?? "";

  if (!email) return { ok: false, key: "validation.emailRequired" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, key: "validation.emailInvalid" };
  if (!password) return { ok: false, key: "validation.passwordRequired" };
  if (password.length < 6)
    return { ok: false, key: "validation.passwordShort" };
  if (password !== passwordConfirm)
    return { ok: false, key: "validation.passwordMismatch" };
  return { ok: true };
}
