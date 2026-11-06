// A level's three stars: one for finishing, one for collecting most of the treats, and one for
// never being grabbed or caught by a chaser.
export const MOST_TREATS = 0.7;

export function starGoals({ collected, total, grabs }) {
  return {
    finished: true,
    treats: total === 0 || collected / total >= MOST_TREATS,
    untouched: grabs === 0,
  };
}

export function starsFor(result) {
  return Object.values(starGoals(result)).filter(Boolean).length;
}

export function starText(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
