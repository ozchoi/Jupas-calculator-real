import programmes from "../src/data/programmes.json" with { type: "json" };

const keys = ["lowerQuartile", "median", "upperQuartile"];
const scores = [0, 14, 20, 27.5, 35, 50, 80, 350];

function isNumericThreshold(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function meets(score, threshold) {
  return Number.isFinite(score) && isNumericThreshold(threshold) && score >= threshold;
}

const failures = [];

for (const programme of programmes) {
  for (const key of keys) {
    for (const score of scores) {
      const actual = meets(score, programme[key]);
      if (!isNumericThreshold(programme[key]) && actual) {
        failures.push(`${programme.jupasCode} incorrectly passed missing ${key} at score ${score}`);
      }
      if (isNumericThreshold(programme[key]) && score < programme[key] && actual) {
        failures.push(`${programme.jupasCode} incorrectly passed ${key} ${programme[key]} at score ${score}`);
      }
      if (isNumericThreshold(programme[key]) && score >= programme[key] && !actual) {
        failures.push(`${programme.jupasCode} incorrectly failed ${key} ${programme[key]} at score ${score}`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Threshold audit passed for ${programmes.length} programmes, ${keys.length} thresholds, ${scores.length} sample scores.`);
