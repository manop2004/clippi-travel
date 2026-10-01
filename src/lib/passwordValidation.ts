export interface PasswordRequirements {
  minLength: boolean;     
  hasLowercase: boolean;   
  hasUppercase: boolean;   
  hasNumber: boolean;      
  hasSpecial: boolean;     
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
  lang: "th" | "en" | "jp" | "zh" | "ko" = "th"
): { label: string; color: string; bgColor: string } {
  if (score <= 1) {
    return {
      label: "pw.veryWeak",
      color: "text-red-600",
      bgColor: "bg-red-500",
    };
  } else if (score === 2) {
    return {
      label: "pw.weak",
      color: "text-amber-600",
      bgColor: "bg-amber-500",
    };
  } else if (score === 3) {
    return {
      label: "pw.fair",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500",
    };
  } else if (score === 4) {
    return {
      label: "pw.good",
      color: "text-emerald-600",
      bgColor: "bg-emerald-500",
    };
  } else {
    return {
      label: "pw.veryStrong",
      color: "text-emerald-700",
      bgColor: "bg-emerald-600",
    };
  }
}
