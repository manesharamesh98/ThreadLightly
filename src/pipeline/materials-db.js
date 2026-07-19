// MADE-BY Environmental Benchmark for Fibres
// Class A = most sustainable (100pts), E = least (20pts), Unclassified = 30pts
// Each entry: canonical name, class, score, description, synonyms (multilingual)

const MATERIALS = [
  // CLASS A
  {
    name: 'Mechanically Recycled Nylon',
    class: 'A', score: 100,
    description: 'Made from pre- or post-consumer nylon waste. Significantly reduces energy use and landfill waste compared to virgin nylon.',
    synonyms: ['recycled nylon', 'nylon recyclé', 'nylon reciclado', 'recyceltes nylon', 'nylon riciclato'],
  },
  {
    name: 'Mechanically Recycled Polyester',
    class: 'A', score: 100,
    description: 'Often made from recycled PET bottles. Uses up to 75% less energy than virgin polyester production.',
    synonyms: ['recycled polyester', 'rPET', 'recycled PET', 'polyester recyclé', 'poliéster reciclado', 'polyester riciclato'],
  },
  {
    name: 'Organic Flax',
    class: 'A', score: 100,
    description: 'Grown without pesticides or synthetic fertilisers. Naturally biodegradable and requires little water.',
    synonyms: ['organic linen', 'lin biologique', 'lino orgánico', 'bio leinen', 'lino biologico'],
  },
  {
    name: 'Organic Hemp',
    class: 'A', score: 100,
    description: 'One of the most sustainable fibres. Grows quickly, requires no pesticides, and improves soil health.',
    synonyms: ['hemp', 'chanvre bio', 'cáñamo orgánico', 'bio hanf', 'canapa biologica'],
  },
  {
    name: 'Recycled Cotton',
    class: 'A', score: 100,
    description: 'Made from pre- or post-consumer cotton waste. Saves water and energy compared to conventional cotton farming.',
    synonyms: ['recycled coton', 'algodón reciclado', 'recycelte baumwolle', 'cotone riciclato'],
  },
  {
    name: 'Recycled Wool',
    class: 'A', score: 100,
    description: 'Reclaimed from wool garments or manufacturing offcuts. Avoids the land and water use of new wool production.',
    synonyms: ['recycled laine', 'lana reciclada', 'recycelte wolle', 'lana riciclata'],
  },

  // CLASS B
  {
    name: 'Chemically Recycled Nylon',
    class: 'B', score: 80,
    description: 'Broken down to monomer level and re-polymerised. High-quality output but energy-intensive chemical process.',
    synonyms: ['econyl', 'aquafil'],
  },
  {
    name: 'Chemically Recycled Polyester',
    class: 'B', score: 80,
    description: 'Chemically depolymerised and re-spun into new fibre. Better quality than mechanical recycling but more energy-intensive.',
    synonyms: [],
  },
  {
    name: 'Organic Cotton',
    class: 'B', score: 80,
    description: 'Grown without synthetic pesticides or fertilisers. Uses less water than conventional cotton and is better for farmers.',
    synonyms: ['coton biologique', 'algodón orgánico', 'bio baumwolle', 'cotone biologico', 'organic coton', 'bio cotton'],
  },
  {
    name: 'TENCEL',
    class: 'B', score: 80,
    description: 'Brand name for Lyocell produced by Lenzing. Made from sustainably sourced wood pulp in a closed-loop solvent process.',
    synonyms: ['lyocell', 'lenzing lyocell', 'tencel lyocell', 'lyocelle'],
  },
  {
    name: 'Monocel',
    class: 'B', score: 80,
    description: 'Bamboo Lyocell produced using a closed-loop process. More sustainable than standard bamboo viscose.',
    synonyms: ['bamboo lyocell'],
  },
  {
    name: 'In Conversion Cotton',
    class: 'B', score: 80,
    description: 'Cotton from farms transitioning to organic certification. Intermediate sustainability between conventional and organic.',
    synonyms: [],
  },
  {
    name: 'CRAiLAR Flax',
    class: 'B', score: 80,
    description: 'Flax processed using an enzyme-based system that reduces water and energy use significantly.',
    synonyms: ['crailar'],
  },

  // CLASS C
  {
    name: 'Conventional Flax',
    class: 'C', score: 60,
    description: 'Also known as linen. Naturally biodegradable and durable, but conventional farming may use some pesticides.',
    synonyms: ['linen', 'lin', 'lino', 'leinen', 'vlas', 'flax'],
  },
  {
    name: 'Conventional Hemp',
    class: 'C', score: 60,
    description: 'Strong, durable, and naturally resistant to pests. More sustainable than most synthetic fibres.',
    synonyms: ['hemp', 'chanvre', 'cáñamo', 'hanf', 'canapa'],
  },
  {
    name: 'PLA',
    class: 'C', score: 60,
    description: 'Polylactic acid, derived from corn starch. Biodegradable under industrial composting conditions.',
    synonyms: ['polylactic acid', 'polylactide'],
  },
  {
    name: 'Ramie',
    class: 'C', score: 60,
    description: 'A natural fibre from the nettle family. Strong and naturally antibacterial, but requires chemical processing.',
    synonyms: ['china grass', 'rhea'],
  },

  // CLASS D
  {
    name: 'Modal',
    class: 'D', score: 40,
    description: 'A type of rayon made from beech tree pulp. Softer than standard viscose but still requires chemical processing.',
    synonyms: ['lenzing modal', 'modal®'],
  },
  {
    name: 'Poly-acrylic',
    class: 'D', score: 40,
    description: 'Petroleum-based synthetic fibre. Sheds microplastics when washed and is not biodegradable.',
    synonyms: ['polyacrylic', 'acrylic', 'acrylique', 'acrílico', 'acryl', 'acrilico'],
  },
  {
    name: 'Virgin Polyester',
    class: 'D', score: 40,
    description: 'Derived from petroleum. Non-biodegradable, sheds microplastics, and takes up to 200 years to decompose.',
    synonyms: ['polyester', 'polyester', 'polyéster', 'poliéster', 'polyester', 'poliestere', 'pet'],
  },

  // CLASS E
  {
    name: 'Bamboo Viscose',
    class: 'E', score: 20,
    description: 'Despite bamboo being fast-growing, the viscose process uses toxic chemicals and is not closed-loop.',
    synonyms: ['bamboo', 'bambou', 'bambus', 'bambù'],
  },
  {
    name: 'Conventional Cotton',
    class: 'E', score: 20,
    description: 'The most water-intensive crop in fashion. Accounts for 16% of global pesticide use despite covering only 3% of farmland.',
    synonyms: ['cotton', 'coton', 'algodón', 'baumwolle', 'cotone', 'katoen', 'coton'],
  },
  {
    name: 'Generic Viscose',
    class: 'E', score: 20,
    description: 'Made from wood pulp but uses a highly polluting chemical process. Often associated with deforestation.',
    synonyms: ['viscose', 'viscosa', 'viskose', 'rayon viscose'],
  },
  {
    name: 'Rayon',
    class: 'E', score: 20,
    description: 'A semi-synthetic fibre made from cellulose. Production involves toxic chemicals including carbon disulfide.',
    synonyms: ['rayon', 'rayonne', 'rayón'],
  },
  {
    name: 'Spandex',
    class: 'E', score: 20,
    description: 'A petroleum-derived synthetic fibre. Non-biodegradable and difficult to recycle when blended with other fibres.',
    synonyms: ['spandex', 'elastane', 'elastán', 'élasthanne', 'elastan', 'elastane', 'lycra'],
  },
  {
    name: 'Elastane',
    class: 'E', score: 20,
    description: 'Also sold as Lycra or Spandex. A petroleum-derived elastic fibre that is non-biodegradable.',
    synonyms: ['elastane', 'élasthanne', 'elastán', 'elastan', 'spandex', 'lycra'],
  },
  {
    name: 'Virgin Nylon',
    class: 'E', score: 20,
    description: 'Produced from petroleum. Energy-intensive to manufacture and releases nitrous oxide, a potent greenhouse gas.',
    synonyms: ['nylon', 'polyamide', 'polyamid', 'poliammide', 'poliamida', 'pa6', 'pa66'],
  },
  {
    name: 'Wool',
    class: 'E', score: 20,
    description: 'Renewable and biodegradable, but sheep farming produces methane and the dyeing/finishing process can be polluting.',
    synonyms: ['wool', 'laine', 'lana', 'wolle', 'wol'],
  },

  // UNCLASSIFIED
  {
    name: 'Silk',
    class: 'Unclassified', score: 30,
    description: 'A natural protein fibre that is biodegradable. However, production raises animal welfare concerns.',
    synonyms: ['silk', 'soie', 'seda', 'seide', 'seta'],
  },
  {
    name: 'Cashmere',
    class: 'Unclassified', score: 30,
    description: 'Extremely soft but requires significant land and water. Overgrazing by cashmere goats contributes to desertification.',
    synonyms: ['cashmere', 'cachemire', 'cachemir', 'kaschmir', 'cachemira'],
  },
  {
    name: 'Leather',
    class: 'Unclassified', score: 30,
    description: 'A byproduct of the meat industry with high environmental impact from tanning chemicals and methane from livestock.',
    synonyms: ['leather', 'cuir', 'cuero', 'leder', 'pelle'],
  },
  {
    name: 'Acetate',
    class: 'Unclassified', score: 30,
    description: 'Derived from cellulose but requires acetone in production. Biodegrades slowly compared to natural fibres.',
    synonyms: ['acetate', 'acétate', 'acetato', 'azetat'],
  },
  {
    name: 'Alpaca',
    class: 'Unclassified', score: 30,
    description: 'Naturally hypoallergenic and warm. More land-efficient than cashmere but sustainability depends heavily on farming practices.',
    synonyms: ['alpaca', 'alpaga', 'alpaka'],
  },
  {
    name: 'Mohair',
    class: 'Unclassified', score: 30,
    description: 'From Angora goats. Durable and lustrous but raises animal welfare concerns and has a significant land footprint.',
    synonyms: ['mohair'],
  },
  {
    name: 'Organic Wool',
    class: 'Unclassified', score: 30,
    description: 'Produced without synthetic pesticides or dips. Better animal welfare standards than conventional wool.',
    synonyms: ['organic wool', 'laine biologique', 'lana orgánica', 'bio wolle'],
  },
  {
    name: 'Natural Bamboo',
    class: 'Unclassified', score: 30,
    description: 'Bamboo mechanically processed without chemicals. Rare and more sustainable than bamboo viscose.',
    synonyms: ['natural bamboo', 'bamboo fibre', 'bamboo fiber'],
  },
];

// Build a flat lookup map: every synonym → material object
const SYNONYM_MAP = new Map();
for (const material of MATERIALS) {
  const keys = [material.name.toLowerCase(), ...material.synonyms.map(s => s.toLowerCase())];
  for (const key of keys) {
    if (!SYNONYM_MAP.has(key)) SYNONYM_MAP.set(key, material);
  }
}

module.exports = { MATERIALS, SYNONYM_MAP };
