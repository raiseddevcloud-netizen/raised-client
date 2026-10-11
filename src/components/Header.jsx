import { Search, ShoppingCart, Menu, UserRound } from "lucide-react";

export default function Header({
  cartCount,
  onCart,
  onMenu,
  onSearch,
  searchOpen,
  setSearchOpen,
  onNavigate,
}) {
  return (
    <header className="site-header">
      <button
        className="mobile-icon menu-trigger"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <a
        className="brand-mark"
        href="/"
        aria-label="RAIZED home"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/");
        }}
      >
        <img src="/images/logo-clean.svg" alt="" />
      </a>
      <div className="header-actions">
        {searchOpen && (
          <input
            className="search-input"
            autoFocus
            placeholder="SEARCH PRODUCTS"
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search products"
          />
        )}
        <button
          className="header-action search-action"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Toggle search"
        >
          <Search size={20} />
          <span>SEARCH</span>
        </button>
        <button
          className="header-action account-action"
          onClick={() => onNavigate("/account")}
          aria-label="Open account"
        >
          <UserRound size={20} />
          <span>ACCOUNT</span>
        </button>
        <button
          className="header-action"
          onClick={onCart}
          aria-label="Open shopping bag"
        >
          <ShoppingCart size={21} />
          <span>BAG ({cartCount})</span>
        </button>
      </div>
    </header>
  );
}
