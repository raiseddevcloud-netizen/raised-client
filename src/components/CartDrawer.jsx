import { X, Minus, Plus } from 'lucide-react'
import { formatPrice } from '../data/products'
export default function CartDrawer({ open, onClose, cart, changeQty, onCheckout }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  return <>
    <div className={`drawer-backdrop ${open ? 'visible' : ''}`} onClick={onClose}/>
    <aside className={`cart-drawer ${open ? 'drawer-open' : ''}`} aria-label="Shopping bag">
      <div className="drawer-header"><strong>YOUR BAG</strong><span>{cart.reduce((s,i)=>s+i.qty,0)} ITEMS</span><button onClick={onClose} aria-label="Close bag"><X size={23}/></button></div>
      <div className="shipping-meter"><div className="meter-track"><div style={{width:`${Math.min(100, subtotal/3500*100)}%`}}/></div><p>{subtotal >= 3500 ? 'YOU UNLOCKED FREE SHIPPING.' : `SPEND ${formatPrice(3500-subtotal, cart[0]?.currencyCode)} MORE FOR FREE SHIPPING.`}</p></div>
      <div className="cart-lines">{cart.length ? cart.map(item => <div className="cart-line" key={`${item.id}-${item.size}`}>{item.image && <img src={item.image} alt={item.name}/>}<div className="cart-line-info"><strong>{item.name} {item.colour && `[${item.colour}]`}</strong><span>{item.size}</span><div className="quantity"><button onClick={()=>changeQty(item.id,item.size,-1)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{item.qty}</span><button onClick={()=>changeQty(item.id,item.size,1)} aria-label="Increase quantity"><Plus size={14}/></button></div></div><b>{formatPrice(item.price*item.qty, item.currencyCode)}</b></div>) : <p className="empty-bag">YOUR BAG IS EMPTY.</p>}</div>
      <div className="recommendations"><h3>CHANGE YOUR LIFE</h3>{[
        {name:'RAIZED CLASSIC TEE [2 PACK]',price:899,image:'/images/jacket-black.jpg'},
        {name:'EVERYDAY SOCKS [2 PACK]',price:399,image:'/images/jacket-camo.jpg'}
      ].map((p,i)=><div className="recommendation" key={p.name}><img src={p.image} alt="Recommended product"/><div><strong>{p.name}</strong><span>{formatPrice(p.price)}</span></div><button onClick={()=>window.dispatchEvent(new CustomEvent('raized-add-recommendation',{detail:{...p,id:90+i,colour:'BLACK',sizes:['M'],size:'M'}}))}>ADD</button></div>)}</div>
      <div className="drawer-bottom"><div className="subtotal"><span>Subtotal</span><strong>{formatPrice(subtotal, cart[0]?.currencyCode)}</strong></div><label className="terms-check"><input type="checkbox"/> <span>I agree to the terms and conditions</span></label><div className="drawer-buttons"><button className="button-outline" onClick={()=>{onClose();window.location.hash='cart'}}>VIEW BAG</button><button className="button-yellow" onClick={onCheckout}>CHECKOUT</button></div></div>
    </aside>
  </>
}
