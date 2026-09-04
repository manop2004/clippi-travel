export interface PasswordRequirements {
  minLength: boolean;     // อย่างน้อย 8 ตัวอักษร
  hasLowercase: boolean;   // ตัวพิมพ์เล็ก (a-z)
  hasUppercase: boolean;   // ตัวพิมพ์ใหญ่ (A-Z)
  hasNumber: boolean;      // ตัวเลข (0-9)
  hasSpecial: boolean;     // สัญลักษณ์พิเศษ (!@#$%^&*...)
}

/**
 * Evaluates password criteria
 */
export function evaluatePassword(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

/**
 * Returns true if all password rules are satisfied
 */
export function isPasswordValid(password: string): boolean {
  const req = evaluatePassword(password);
  return req.minLength && req.hasLowercase && req.hasUppercase && req.hasNumber && req.hasSpecial;
}

/**
 * Calculates score from 0 to 5
 */
export function getPasswordScore(req: PasswordRequirements): number {
  let score = 0;
  if (req.minLength) score++;
  if (req.hasLowercase) score++;
  if (req.hasUppercase) score++;
  if (req.hasNumber) score++;
  if (req.hasSpecial) score++;
  return score;
}

/**
 * Returns human readable password strength label and styling
 */
export function getPasswordStrengthLabel(
  score: number,
  lang: "th" | "en" | "jp" = "th"
): { label: string; color: string; bgColor: string } {
  if (score <= 1) {
    return {
      label: lang === "en" ? "Very Weak" : lang === "jp" ? "非常に弱い" : "อ่อนมาก",
      color: "text-red-600",
      bgColor: "bg-red-500",
    };
  } else if (score === 2) {
    return {
      label: lang === "en" ? "Weak" : lang === "jp" ? "弱い" : "อ่อน",
      color: "text-amber-600",
      bgColor: "bg-amber-500",
    };
  } else if (score === 3) {
    return {
      label: lang === "en" ? "Fair" : lang === "jp" ? "普通" : "ปานกลาง",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500",
    };
  } else if (score === 4) {
    return {
      label: lang === "en" ? "Good" : lang === "jp" ? "良い" : "แข็งแรง",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500",
    };
  } else {
    return {
      label: lang === "en" ? "Very Strong" : lang === "jp" ? "非常に強い" : "แข็งแรงมาก",
      color: "text-emerald-700",
      bgColor: "bg-emerald-600",
    };
  }
}
