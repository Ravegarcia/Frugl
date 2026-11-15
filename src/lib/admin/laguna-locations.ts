export type LagunaSellerLocation = {
  name: string;
  coordinates: [number, number];
  sellerCount: number;
};

const lagunaMunicipalities = [
  { name: 'Alaminos', aliases: ['alaminos'], coordinates: [14.063, 121.246] },
  { name: 'Bay', aliases: ['bay'], coordinates: [14.183, 121.286] },
  { name: 'Biñan', aliases: ['binan', 'binan city'], coordinates: [14.341, 121.080] },
  { name: 'Cabuyao', aliases: ['cabuyao', 'cabuyao city'], coordinates: [14.272, 121.125] },
  { name: 'Calamba', aliases: ['calamba', 'calamba city'], coordinates: [14.211, 121.165] },
  { name: 'Calauan', aliases: ['calauan'], coordinates: [14.150, 121.315] },
  { name: 'Cavinti', aliases: ['cavinti'], coordinates: [14.245, 121.508] },
  { name: 'Famy', aliases: ['famy'], coordinates: [14.436, 121.449] },
  { name: 'Kalayaan', aliases: ['kalayaan'], coordinates: [14.350, 121.478] },
  { name: 'Liliw', aliases: ['liliw'], coordinates: [14.132, 121.436] },
  { name: 'Los Baños', aliases: ['los banos', 'los banos city'], coordinates: [14.170, 121.242] },
  { name: 'Luisiana', aliases: ['luisiana'], coordinates: [14.187, 121.520] },
  { name: 'Lumban', aliases: ['lumban'], coordinates: [14.297, 121.460] },
  { name: 'Mabitac', aliases: ['mabitac'], coordinates: [14.430, 121.430] },
  { name: 'Magdalena', aliases: ['magdalena'], coordinates: [14.200, 121.430] },
  { name: 'Majayjay', aliases: ['majayjay'], coordinates: [14.145, 121.473] },
  { name: 'Nagcarlan', aliases: ['nagcarlan'], coordinates: [14.136, 121.416] },
  { name: 'Paete', aliases: ['paete'], coordinates: [14.360, 121.480] },
  { name: 'Pagsanjan', aliases: ['pagsanjan'], coordinates: [14.270, 121.450] },
  { name: 'Pakil', aliases: ['pakil'], coordinates: [14.380, 121.480] },
  { name: 'Pangil', aliases: ['pangil'], coordinates: [14.400, 121.460] },
  { name: 'Pila', aliases: ['pila'], coordinates: [14.230, 121.360] },
  { name: 'Rizal', aliases: ['rizal'], coordinates: [14.110, 121.400] },
  { name: 'San Pablo', aliases: ['san pablo', 'san pablo city'], coordinates: [14.070, 121.325] },
  { name: 'San Pedro', aliases: ['san pedro', 'san pedro city'], coordinates: [14.360, 121.060] },
  { name: 'Santa Cruz', aliases: ['santa cruz', 'santa cruz laguna', 'sta cruz'], coordinates: [14.280, 121.420] },
  { name: 'Santa Maria', aliases: ['santa maria', 'sta maria'], coordinates: [14.470, 121.430] },
  { name: 'Santa Rosa', aliases: ['santa rosa', 'santa rosa city', 'sta rosa'], coordinates: [14.310, 121.110] },
  { name: 'Siniloan', aliases: ['siniloan'], coordinates: [14.420, 121.450] },
  { name: 'Victoria', aliases: ['victoria'], coordinates: [14.230, 121.330] },
] satisfies Array<{
  name: string;
  aliases: string[];
  coordinates: [number, number];
}>;

function normalizeLocation(location: string) {
  return location
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9,/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findLagunaMunicipality(location: string | null) {
  if (!location?.trim()) return null;

  const segments = normalizeLocation(location)
    .split(/[,/]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== 'laguna' && segment !== 'philippines')
    .reverse();

  for (const segment of segments) {
    const municipality = lagunaMunicipalities.find(({ aliases }) =>
      aliases.some((alias) =>
        segment === alias || segment.startsWith(`${alias} `) || segment.endsWith(` ${alias}`),
      ),
    );
    if (municipality) return municipality;
  }

  return null;
}
