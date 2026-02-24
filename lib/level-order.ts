// Define the grade level order for sorting students
const levelOrder: Record<string, number> = {
  'Toddler & Nursery': 1,
  'Pre-K': 2,
  'Kinder 1': 3,
  'Kinder 2': 4,
  'Grade 1': 5,
  'Grade 2': 6,
  'Grade 3': 7,
  'Grade 4': 8,
  'Grade 5': 9,
  'Grade 6': 10,
  'Grade 7': 11,
  'Grade 8': 12,
};

export function getLevelOrder(level: string): number {
  return levelOrder[level] || 999; // Unknown levels go to end
}

export function sortByLevel<T extends { level: string }>(students: T[]): T[] {
  return [...students].sort((a, b) => {
    const orderA = getLevelOrder(a.level);
    const orderB = getLevelOrder(b.level);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // If same level, maintain original order
    return 0;
  });
}
