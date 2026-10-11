import { Instagram, Sun } from "lucide-react";
export default function Sidebar({
  open,
  onClose,
  onNewsletter,
  categories = [],
  activeCategory,
  onCategorySelect,
  isLightTheme,
  onToggleTheme,
  onNavigate,
  isSignedIn,
  onSignOut,
}) {
  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <span className="sidebar-label">CATEGORIES</span>
          <button
            className="close-menu"
            onClick={onClose}
            aria-label="Close menu"
          >
            <span>×</span>
          </button>
        </div>
        <nav className="category-list">
          <a
            href="/#shop"
            onClick={(event) => {
              event.preventDefault();
              onCategorySelect?.(null);
              onNavigate("/#shop");
            }}
            className={!activeCategory ? "category-active" : ""}
          >
            All
          </a>
          {categories.map((category) => (
            <a
              href="/#shop"
              key={category.id || category.handle}
              onClick={(event) => {
                event.preventDefault();
                onCategorySelect?.(category.handle);
                onNavigate("/#shop");
              }}
              className={
                activeCategory === category.handle ? "category-active" : ""
              }
            >
              {category.title}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="socials">
            <a href="#instagram" aria-label="Instagram">
              <Instagram size={19} />
            </a>
            <button
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isLightTheme ? "dark" : "light"} theme`}
              title={`Switch to ${isLightTheme ? "dark" : "light"} theme`}
            >
              <Sun size={19} />
            </button>
          </div>
          <a
            href="/about"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/about");
            }}
          >
            ABOUT
          </a>
          <a
            href="/account"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/account");
            }}
          >
            ACCOUNT
          </a>
          <a
            href="/account/orders"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/account/orders");
            }}
          >
            MY ORDERS
          </a>
          {isSignedIn && (
            <button
              className="sidebar-newsletter"
              onClick={onSignOut}
            >
              SIGN OUT
            </button>
          )}
          <a
            href="/archive"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/archive");
            }}
          >
            ARCHIVE
          </a>
          <button
            className="sidebar-newsletter"
            onClick={() => {
              onClose();
              onNewsletter();
            }}
          >
            NEWSLETTER
          </button>
          <a href="#shipping">SHIPPING POLICY</a>
          <a href="#terms">TERMS OF SERVICE</a>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
    </>
  );
}
