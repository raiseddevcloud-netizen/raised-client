export const products = [
  { id: 1, name: 'GILBERT PUFFER JACKET', colour: 'TRIPLE BLACK', price: 2499, image: '/images/jacket-black.jpg', tag: 'LATEST DROP', sizes: ['S','M','L','XL','XXL'], description: 'Built for the pressure. A heavyweight padded layer with a structured hood, utility pockets and a clean tonal finish.' },
  { id: 2, name: 'GILBERT PUFFER JACKET', colour: 'WOODLAND CAMO', price: 2499, image: '/images/jacket-camo.jpg', tag: 'LIMITED', sizes: ['S','M','L','XL','XXL'], description: 'A familiar silhouette with a disruptive woodland camouflage pattern. Designed for everyday movement.' },
  { id: 3, name: 'PRESSURE SHELL JACKET', colour: 'SIGNAL', price: 2199, image: '/images/jacket-colorblock.jpg', tag: 'NEW', sizes: ['S','M','L','XL'], description: 'Weather-ready outerwear with contrast panels, secure zip pockets and a bold technical profile.' },
  { id: 4, name: 'FIELD JACKET', colour: 'EARTH CAMO', price: 1899, image: '/images/jacket-camo.jpg', tag: 'RAIZED CORE', sizes: ['S','M','L','XL','XXL'], description: 'Utility-inspired outerwear made for the city. Functional details, restrained branding and a durable feel.' },
  { id: 5, name: 'TRACK JACKET', colour: 'STONE / OLIVE', price: 1699, image: '/images/jacket-colorblock.jpg', tag: 'CORE', sizes: ['S','M','L','XL'], description: 'A relaxed track layer with clean lines and a sport-derived fit.' },
  { id: 6, name: 'GILBERT PUFFER JACKET', colour: 'TRIPLE BLACK', price: 2499, image: '/images/jacket-black.jpg', tag: 'RESTOCK', sizes: ['S','M','L','XL','XXL'], description: 'The original all-black puffer. A statement in restraint.' }
]
export const formatPrice = (price, currencyCode = 'INR') => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: currencyCode,
  maximumFractionDigits: 2,
}).format(price)
