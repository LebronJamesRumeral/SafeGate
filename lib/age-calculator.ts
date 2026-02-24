/**
 * Calculate age with decimal progression based on birthday
 * Age is calculated as: years + (months / 12), rounded to 1 decimal place
 * For example: born January 1, 2023 → February 2026 = 3.1 years old
 */
export function calculateAgeWithDecimal(birthdayString: string, referenceDate: Date = new Date()): number {
  const birthday = new Date(birthdayString);
  
  let years = referenceDate.getFullYear() - birthday.getFullYear();
  let months = referenceDate.getMonth() - birthday.getMonth();
  
  // If birthday hasn't occurred this month yet, subtract a year
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // If birthday is today, don't subtract
  if (referenceDate.getDate() < birthday.getDate() && months === 0 && years > 0) {
    years--;
    months = 11;
  }
  
  const ageDecimal = parseFloat((years + months / 12).toFixed(1));
  return ageDecimal;
}

/**
 * Check if a student should show age (younger age groups)
 */
export function shouldShowAge(level: string): boolean {
  const youngerLevels = [
    'Toddler & Nursery',
    'Pre-K',
    'Kinder 1',
    'Kinder 2',
  ];
  return youngerLevels.includes(level);
}
