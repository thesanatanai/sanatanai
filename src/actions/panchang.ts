import Panchangam, {
  Festival,
  Observer,
  tithiNames,
} from "@ishubhamx/panchangam-js";

function getPanchang() {
  const date = new Date();
  const observer = new Observer(23.1765, 75.7885, 494); // Varanasi
  const panchang = Panchangam.getPanchangam(date, observer, {
    timezoneOffset: date.getTimezoneOffset(),
  });
  return `
### Today's Panchanga:
- Tithi: ${tithiNames[panchang.tithi]}
- Month: ${panchang.masa.isAdhika ? "Adhika " : ""}${panchang.masa.name} (${panchang.paksha} Paksha)
- Festivals Today: ${formatFestivals(panchang.festivals)}
`;
}

function formatFestivals(festivals: Festival[], extended = false) {
  return festivals
    .map((festival) => {
      const {
        name,
        category,
        date,
        description,
        tithi,
        masa,
        startDate,
        endDate,
      } = festival;

      const main = `\n ${name}: ${description}`;
      const secondary = `
  - date (start): ${(startDate || date).toString()}
  - date (end): ${endDate?.toString() || "Not Available"}
  - category: ${category}
  - Tithi: ${tithi ? tithiNames[tithi] : "Not Available"}
  - Masa: ${masa || "Not Available"}`;
      return main + (extended ? secondary : "");
    })
    .join(";");
}

export function getUpcomingFestivals() {
  const date = new Date();
  const observer = new Observer(23.1765, 75.7885, 494);
  const upcoming = Panchangam.getUpcomingFestivals({
    date,
    observer,
    timezoneOffset: date.getTimezoneOffset(),
    days: 30,
  });
  return formatFestivals(upcoming, true);
}

export default getPanchang;
