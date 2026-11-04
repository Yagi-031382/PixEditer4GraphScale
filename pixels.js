export function replaceColor(data, source, target) {
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (source.every((value, channel) => data[i + channel] === value)) {
      data.set(target, i);
      count++;
    }
  }
  return count;
}

export function countColor(data, source) {
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (source.every((value, channel) => data[i + channel] === value)) count++;
  }
  return count;
}

// Achromatic colors have no hue. Fully transparent pixels carry no visible hue.
export function hue(color) {
  const [r, g, b] = color;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (!delta || color[3] === 0) return null;
  let h = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
}

function matcher(selections) {
  const exact = new Set(selections.map(s => s.color.join(',')));
  const similar = selections.filter(s => s.similar && hue(s.color) !== null)
    .map(s => ({ hue: hue(s.color), tolerance: s.tolerance ?? 15 }));
  return color => {
    if (exact.has(color.join(','))) return true;
    const h = hue(color);
    return h !== null && similar.some(s => {
      const difference = Math.abs(h - s.hue);
      return Math.min(difference, 360 - difference) <= s.tolerance;
    });
  };
}

export function countSelections(data, selections) {
  const matches = matcher(selections);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (matches(data.subarray(i, i + 4))) count++;
  }
  return count;
}

export function replaceSelections(data, selections, target) {
  const matches = matcher(selections);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (matches(data.subarray(i, i + 4))) {
      data.set(target, i);
      count++;
    }
  }
  return count;
}
