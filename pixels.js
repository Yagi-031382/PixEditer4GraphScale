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
