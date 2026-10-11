import { formatPrice } from '../data/products'
export default function ProductCard({ product, onSelect }) {
  return <button className="product-card text-left" onClick={() => onSelect(product)} aria-label={`View ${product.name} ${product.colour}`}>
    <div className="product-image-wrap">{product.image && <img src={product.image} alt={product.imageAlt || `${product.name} in ${product.colour}`} loading="lazy"/>}</div>
    <div className="product-meta"><span>{product.name}{product.colour ? ` [${product.colour}]` : ''}</span><span>{formatPrice(product.price, product.currencyCode)}</span></div>
  </button>
}
