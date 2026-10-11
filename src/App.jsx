import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, X } from "lucide-react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProductCard from "./components/ProductCard";
import CartDrawer from "./components/CartDrawer";
import { formatPrice } from "./data/products";
import {
  createShopifyCheckout,
  getShopifyCatalog,
  getShopifyProductsPage,
  isShopifyConfigured,
} from "./lib/shopify";
import {
  beginCustomerLogin,
  completeCustomerLogin,
  endCustomerSession,
  getCustomerOrders,
  getCustomerProfile,
  isCustomerAccountConfigured,
  restoreCustomerSession,
} from "./lib/customerAccount";

function ProductDetail({ product, onBack, addToCart }) {
  const [size, setSize] = useState("");
  const [openPanel, setOpenPanel] = useState("DETAILS");
  if (!product) return null;
  const panels = {
    DETAILS: (
      <ul>
        <li>Relaxed, everyday fit.</li>
        <li>Durable outer shell and padded construction.</li>
        <li>Functional front pockets.</li>
        <li>Signature RAIZED detailing.</li>
        <li>Designed in Mumbai.</li>
      </ul>
    ),
    "SIZE GUIDE": (
      <div className="size-guide">
        <p>GARMENT MEASUREMENTS (INCHES)</p>
        <table>
          <thead>
            <tr>
              <th>SIZE</th>
              <th>S</th>
              <th>M</th>
              <th>L</th>
              <th>XL</th>
              <th>XXL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CHEST</td>
              <td>22</td>
              <td>23</td>
              <td>24</td>
              <td>25</td>
              <td>26</td>
            </tr>
            <tr>
              <td>LENGTH</td>
              <td>26</td>
              <td>27</td>
              <td>28</td>
              <td>29</td>
              <td>30</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
    "SHIPPING POLICY": (
      <p>
        Orders are processed within 2–4 working days. Delivery timelines are
        shown at checkout. Pre-order items ship on the date mentioned on the
        product page.
      </p>
    ),
  };
  return (
    <main className="detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> BACK TO SHOP
      </button>
      <div className="detail-layout">
        <div className="detail-visual">
          {product.image && (
            <img
              src={product.image}
              alt={product.imageAlt || `${product.name} ${product.colour}`}
            />
          )}
          <span>RAIZED® / PRODUCT 00{product.id}</span>
        </div>
        <section className="detail-info">
          <p className="eyebrow">{product.tag} — RAIZED®</p>
          <h1>
            {product.name} [{product.colour}]
          </h1>
          <div className="detail-price">
            {formatPrice(product.price, product.currencyCode)}
          </div>
          <p className="field-label">SIZE</p>
          <div className="size-options">
            {product.sizes.map((s) => (
              <button
                key={s}
                className={size === s ? "selected" : ""}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="field-label">COLOUR</p>
          <div className="colour-option">
            <button className="selected">
              <img src={product.image} alt={product.colour} />
            </button>
            <span>{product.colour}</span>
          </div>
          <button
            className="button-yellow add-button"
            onClick={() =>
              size
                ? addToCart(product, size)
                : document
                    .querySelector(".size-options")
                    ?.classList.add("needs-size")
            }
          >
            {size
              ? "ADD TO BAG — " +
                formatPrice(product.price, product.currencyCode)
              : "SELECT SIZE"}
          </button>
          <p className="detail-description">{product.description}</p>
          <div className="accordion">
            {Object.keys(panels).map((label) => (
              <section key={label}>
                <button
                  onClick={() => setOpenPanel(openPanel === label ? "" : label)}
                >
                  {label}
                  {openPanel === label ? (
                    <ChevronDown size={17} />
                  ) : (
                    <ChevronRight size={17} />
                  )}
                </button>
                {openPanel === label && (
                  <div className="accordion-content">{panels[label]}</div>
                )}
              </section>
            ))}
          </div>
          <p className="red-note">
            PRESSURE RAISED ME. BUILT TO OUTLAST THE NOISE.
          </p>
        </section>
      </div>
    </main>
  );
}

function Checkout({
  cart,
  onBack,
  onContinue,
  isProcessing,
  checkoutError,
}) {
  return (
    <main className="checkout-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> RETURN TO BAG
      </button>
      <div className="checkout-grid">
        <section>
          <div className="checkout-brand">
            RAIZED<span>®</span>
          </div>
          <h2>Secure checkout</h2>
          <p>
            Shipping information and payment are securely completed through
            Shopify.
          </p>
          {checkoutError && (
            <p className="account-error" role="alert">
              {checkoutError}
            </p>
          )}
          <button
            className="button-yellow checkout-continue"
            onClick={onContinue}
            disabled={isProcessing}
          >
            {isProcessing
              ? "CONNECTING TO SHOPIFY…"
              : "CONTINUE TO SHOPIFY CHECKOUT"}
          </button>
        </section>
        <aside className="order-summary">
          <h3>ORDER SUMMARY</h3>
          {cart.map((item) => (
            <div className="summary-line" key={`${item.id}-${item.size}`}>
              {item.image && <img src={item.image} alt="" />}
              <span>
                {item.name} [{item.colour}] · {item.size} × {item.qty}
              </span>
              <b>{formatPrice(item.price * item.qty, item.currencyCode)}</b>
            </div>
          ))}
          <div className="subtotal">
            <span>Subtotal</span>
            <strong>
              {formatPrice(
                cart.reduce((s, i) => s + i.price * i.qty, 0),
                cart[0]?.currencyCode,
              )}
            </strong>
          </div>
          <p>Shipping calculated at next step</p>
        </aside>
      </div>
    </main>
  );
}

function AccountPage({
  accountStatus,
  customer,
  accountError,
  isOrdersPage,
  orders,
  ordersStatus,
  ordersError,
  onShopSignIn,
  onSignOut,
  onLoadMoreOrders,
  hasMoreOrders,
  onNavigate,
}) {
  const formatDate = (date) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(date),
    );
  const formatOrderTotal = (total) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: total.currencyCode,
    }).format(Number(total.amount));

  return (
    <main className="account-page">
      <div className="account-heading">
        <h1>
          {isOrdersPage ? "MY ORDERS" : "MY ACCOUNT"}
        </h1>
        {customer && (
          <p>
            {customer.displayName}
            {customer.emailAddress?.emailAddress
              ? ` · ${customer.emailAddress.emailAddress}`
              : ""}
          </p>
        )}
      </div>
      {accountStatus === "checking" || accountStatus === "authenticating" ? (
        <div className="catalog-loader" role="status" aria-label="Checking account">
          <img src="/images/logo-clean.svg" alt="" />
          <p>CONNECTING TO YOUR ACCOUNT…</p>
        </div>
      ) : accountStatus !== "signed-in" ? (
        <section className="account-message">
          <p>
            {isOrdersPage
              ? "SIGN IN WITH SHOP TO VIEW YOUR ORDERS."
              : "SIGN IN WITH SHOP TO VIEW YOUR ACCOUNT AND TRACK ORDERS."}
          </p>
          <button
            className="button-yellow"
            onClick={onShopSignIn}
            disabled={!isCustomerAccountConfigured}
          >
            SIGN IN WITH SHOP
          </button>
          {accountError && (
            <p className="account-error" role="alert">
              {accountError}
            </p>
          )}
          {!isCustomerAccountConfigured && (
            <p className="account-error">
              SHOPIFY CUSTOMER ACCOUNT SIGN-IN IS NOT CONFIGURED.
            </p>
          )}
        </section>
      ) : (
        <>
          {accountError && (
            <p className="account-error" role="alert">
              {accountError}
            </p>
          )}
          {isOrdersPage ? (
            ordersStatus === "loading" ? (
              <div className="catalog-loader" role="status" aria-label="Loading orders">
                <img src="/images/logo-clean.svg" alt="" />
                <p>LOADING YOUR ORDERS…</p>
              </div>
            ) : ordersError ? (
              <p className="account-error" role="alert">
                {ordersError}
              </p>
            ) : orders.length ? (
              <div className="orders-list">
                {orders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-heading">
                      <div>
                        <h2>{order.name}</h2>
                        <p>PLACED {formatDate(order.processedAt)}</p>
                      </div>
                      <strong>{formatOrderTotal(order.totalPrice)}</strong>
                    </div>
                    <p className="order-status">
                      PAYMENT: {order.financialStatus || "PENDING"} · FULFILLMENT:{" "}
                      {order.fulfillmentStatus || "UNFULFILLED"}
                    </p>
                    <ul className="order-items">
                      {order.lineItems.nodes.map((item, index) => (
                        <li key={`${order.id}-${item.title}-${index}`}>
                          {item.title} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                    {order.fulfillments.nodes.flatMap((fulfillment, index) =>
                      fulfillment.trackingInformation.map((tracking) => (
                        <p
                          className="order-tracking"
                          key={`${order.id}-tracking-${index}-${tracking.number}`}
                        >
                          {tracking.company ? `${tracking.company}: ` : ""}
                          {tracking.url ? (
                            <a href={tracking.url} target="_blank" rel="noreferrer">
                              TRACK {tracking.number || "SHIPMENT"} ↗
                            </a>
                          ) : (
                            tracking.number
                          )}
                        </p>
                      )),
                    )}
                    {order.statusUrl && (
                      <p className="order-tracking">
                        <a href={order.statusUrl} target="_blank" rel="noreferrer">
                          VIEW ORDER STATUS ↗
                        </a>
                      </p>
                    )}
                  </article>
                ))}
                {hasMoreOrders && (
                  <button
                    className="button-outline"
                    onClick={onLoadMoreOrders}
                    disabled={ordersStatus === "loading-more"}
                  >
                    {ordersStatus === "loading-more"
                      ? "LOADING…"
                      : "LOAD MORE ORDERS"}
                  </button>
                )}
              </div>
            ) : (
              <p className="no-results">NO ORDERS FOUND FOR THIS ACCOUNT YET.</p>
            )
          ) : (
            <section className="account-actions">
              <button
                className="button-outline"
                onClick={() => onNavigate("/account/orders")}
              >
                VIEW MY ORDERS
              </button>
            </section>
          )}
          <button className="account-signout" onClick={onSignOut}>
            SIGN OUT
          </button>
        </>
      )}
    </main>
  );
}

function AboutPage({ onNavigate }) {
  return (
    <>
      <main className="story-section" id="about">
        <div className="story-index">RAIZED® — OUR POINT OF ORIGIN</div>
        <div>
          <p className="eyebrow">THE STORY</p>
          <h2>
            PRESSURE DOESN'T
            <br />
            BREAK EVERYONE.
          </h2>
          <p>
            Some things are shaped by pressure. Gilbert Hill stands as a
            reminder that rarity is earned through time, force and survival.
            RAIZED comes from that same idea — Mumbai-built, made for people
            who keep moving when the conditions get hard.
          </p>
          <a
            href="/#shop"
            className="story-link"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/#shop");
            }}
          >
            SHOP THE COLLECTION ↗
          </a>
        </div>
        <div className="story-mark">
          R<span>®</span>
        </div>
      </main>
      <footer className="site-footer">
        <p>PRESSURE RAISED ME.</p>
        <p>© 2026 RAIZED® — MUMBAI, INDIA. ALL RIGHTS RESERVED.</p>
      </footer>
    </>
  );
}

function ArchivePage() {
  return (
    <>
      <main className="shop-section">
        <div className="section-heading">
          <h2>ARCHIVE</h2>
        </div>
        <p className="no-results">COMING SOON</p>
      </main>
      <footer className="site-footer">
        <p>PRESSURE RAISED ME.</p>
        <p>© 2026 RAIZED® — MUMBAI, INDIA. ALL RIGHTS RESERVED.</p>
      </footer>
    </>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLightTheme, setIsLightTheme] = useState(
    () => localStorage.getItem("raized-theme") === "light",
  );
  const [catalog, setCatalog] = useState({
    products: [],
    categories: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  });
  const [paginationStatus, setPaginationStatus] = useState("idle");
  const [paginationError, setPaginationError] = useState("");
  const paginationRequestInFlight = useRef(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState(
    isShopifyConfigured ? "loading" : "error",
  );
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [accountSession, setAccountSession] = useState(null);
  const [accountCustomer, setAccountCustomer] = useState(null);
  const [accountStatus, setAccountStatus] = useState("checking");
  const [accountError, setAccountError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersPageInfo, setOrdersPageInfo] = useState({
    hasNextPage: false,
    endCursor: null,
  });
  const [ordersStatus, setOrdersStatus] = useState("idle");
  const [ordersError, setOrdersError] = useState("");
  const accountInitializationStarted = useRef(false);
  const ordersRequestInFlight = useRef(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentPath, setCurrentPath] = useState(
    () =>
      `${window.location.pathname.replace(/\/+$/, "") || "/"}${window.location.hash}`,
  );
  const routePath = currentPath.split("#", 1)[0];
  const isAboutPage = routePath === "/about";
  const isArchivePage = routePath === "/archive";
  const isAccountPage = [
    "/account",
    "/account/orders",
    "/account/login",
    "/account/signup",
  ].includes(routePath);
  const isOrdersPage = routePath === "/account/orders";
  const isAccountCallback = routePath === "/account/callback";
  const navigateTo = (path) => {
    const destination = new URL(path, window.location.origin);
    if (destination.origin !== window.location.origin) return;
    window.history.pushState({}, "", destination);
    setCurrentPath(
      `${destination.pathname.replace(/\/+$/, "") || "/"}${destination.hash}`,
    );
    setSelected(null);
    setCheckout(false);
    setMenuOpen(false);
  };
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(
        `${window.location.pathname.replace(/\/+$/, "") || "/"}${window.location.hash}`,
      );
      setSelected(null);
      setCheckout(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    if (accountInitializationStarted.current) return;
    accountInitializationStarted.current = true;
    if (isAccountCallback) {
      completeCustomerLogin(window.location.href)
        .then(({ session, returnTo }) => {
          const destination = new URL(returnTo, window.location.origin);
          if (destination.origin !== window.location.origin) {
            throw new Error("Shopify returned an invalid account destination.");
          }
          window.history.replaceState({}, "", destination);
          setCurrentPath(
            `${destination.pathname.replace(/\/+$/, "") || "/"}${destination.hash}`,
          );
          setAccountSession(session);
          setAccountStatus("signed-in");
          setAccountError("");
        })
        .catch((error) => {
          console.error("Unable to complete Shopify customer sign-in:", error);
          window.history.replaceState({}, "", "/account");
          setCurrentPath("/account");
          setAccountStatus("signed-out");
          setAccountError(error.message);
        });
      return;
    }
    restoreCustomerSession()
      .then((session) => {
        setAccountSession(session);
        setAccountStatus(session ? "signed-in" : "signed-out");
      })
      .catch((error) => {
        console.error("Unable to restore Shopify customer session:", error);
        setAccountStatus("signed-out");
        setAccountError(error.message);
      });
  }, [isAccountCallback]);
  useEffect(() => {
    if (!accountSession) {
      setAccountCustomer(null);
      return;
    }
    let cancelled = false;
    getCustomerProfile()
      .then(({ session, customer }) => {
        if (!cancelled) {
          setAccountSession(session);
          setAccountCustomer(customer);
          setAccountError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load Shopify customer profile:", error);
          setAccountError(error.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountSession?.accessToken]);
  useEffect(() => {
    if (!isOrdersPage || !accountSession) return undefined;
    let cancelled = false;
    setOrdersStatus("loading");
    setOrdersError("");
    getCustomerOrders()
      .then((result) => {
        if (!cancelled) {
          setAccountSession(result.session);
          setAccountCustomer(result.customer);
          setOrders(result.orders);
          setOrdersPageInfo(result.pageInfo);
          setOrdersStatus("idle");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load Shopify customer orders:", error);
          setOrdersError(error.message);
          setOrdersStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOrdersPage, accountSession?.accessToken]);
  useEffect(() => {
    if (window.location.hash) {
      requestAnimationFrame(() => {
        document
          .querySelector(window.location.hash)
          ?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPath]);
  useEffect(() => {
    localStorage.setItem("raized-theme", isLightTheme ? "light" : "dark");
  }, [isLightTheme]);
  useEffect(() => {
    if (!isShopifyConfigured) return undefined;
    let cancelled = false;
    getShopifyCatalog()
      .then((shopifyCatalog) => {
        if (!cancelled) {
          console.log("Fetched categories:", shopifyCatalog.categories);
          setCatalog(shopifyCatalog);
          setCatalogStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load Shopify catalog:", error);
          setCatalogStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const loadMoreProducts = async () => {
    if (
      !catalog.pageInfo.hasNextPage ||
      !catalog.pageInfo.endCursor ||
      paginationRequestInFlight.current
    ) {
      return;
    }
    paginationRequestInFlight.current = true;
    setPaginationStatus("loading");
    setPaginationError("");
    try {
      const nextPage = await getShopifyProductsPage(catalog.pageInfo.endCursor);
      setCatalog((currentCatalog) => ({
        ...currentCatalog,
        products: [...currentCatalog.products, ...nextPage.products],
        pageInfo: nextPage.pageInfo,
      }));
      setPaginationStatus("idle");
    } catch (error) {
      console.error("Unable to load more Shopify products:", error);
      setPaginationError("MORE PRODUCTS COULDN’T LOAD. PLEASE TRY AGAIN.");
      setPaginationStatus("error");
    } finally {
      paginationRequestInFlight.current = false;
    }
  };
  const loadMoreOrders = async () => {
    if (
      !accountSession ||
      !ordersPageInfo.hasNextPage ||
      !ordersPageInfo.endCursor ||
      ordersRequestInFlight.current
    ) {
      return;
    }
    ordersRequestInFlight.current = true;
    setOrdersStatus("loading-more");
    setOrdersError("");
    try {
      const nextPage = await getCustomerOrders(ordersPageInfo.endCursor);
      setAccountSession(nextPage.session);
      setAccountCustomer(nextPage.customer);
      setOrders((currentOrders) => [...currentOrders, ...nextPage.orders]);
      setOrdersPageInfo(nextPage.pageInfo);
      setOrdersStatus("idle");
    } catch (error) {
      console.error("Unable to load more Shopify customer orders:", error);
      setOrdersError("MORE ORDERS COULDN’T LOAD. PLEASE TRY AGAIN.");
      setOrdersStatus("error");
    } finally {
      ordersRequestInFlight.current = false;
    }
  };
  const signInWithShop = async () => {
    setAccountError("");
    setAccountStatus("authenticating");
    try {
      await beginCustomerLogin(
        isOrdersPage ? "/account/orders" : "/account",
      );
    } catch (error) {
      console.error("Unable to start Shopify Shop sign-in:", error);
      setAccountError(error.message);
      setAccountStatus("signed-out");
    }
  };
  const signOut = () => {
    const logoutUrl = endCustomerSession();
    setAccountSession(null);
    setAccountCustomer(null);
    setOrders([]);
    setOrdersPageInfo({ hasNextPage: false, endCursor: null });
    setAccountStatus("signed-out");
    setAccountError("");
    if (logoutUrl) {
      window.location.assign(logoutUrl);
    } else {
      navigateTo("/account");
    }
  };
  const continueToShopifyCheckout = async () => {
    setCheckoutStatus("loading");
    setCheckoutError("");
    try {
      const checkoutUrl = await createShopifyCheckout(cart);
      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error("Unable to create Shopify checkout:", error);
      setCheckoutError(error.message);
      setCheckoutStatus("error");
    }
  };
  const filtered = useMemo(
    () =>
      catalog.products.filter(
        (p) =>
          (query.trim() ||
            !activeCategory ||
            p.collectionHandles?.includes(activeCategory)) &&
          `${p.name} ${p.colour} ${p.tag}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [catalog.products, activeCategory, query],
  );
  const activeCategoryName = catalog.categories.find(
    (category) => category.handle === activeCategory,
  )?.title;
  const addToCart = (product, size) => {
    setCart((old) => {
      const found = old.find((i) => i.id === product.id && i.size === size);
      return found
        ? old.map((i) => (i === found ? { ...i, qty: i.qty + 1 } : i))
        : [...old, { ...product, size, qty: 1 }];
    });
    setSelected(null);
    setCartOpen(true);
    setNotice("ADDED TO BAG");
  };
  const changeQty = (id, size, delta) =>
    setCart((old) =>
      old
        .map((i) =>
          i.id === id && i.size === size ? { ...i, qty: i.qty + delta } : i,
        )
        .filter((i) => i.qty > 0),
    );
  useEffect(() => {
    const listener = (e) => {
      const p = e.detail;
      setCart((old) => [...old, { ...p, qty: 1 }]);
      setCartOpen(true);
    };
    window.addEventListener("raized-add-recommendation", listener);
    return () =>
      window.removeEventListener("raized-add-recommendation", listener);
  }, []);
  useEffect(() => {
    if (!newsletterOpen) return undefined;
    const listener = (e) => {
      if (e.key === "Escape") setNewsletterOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [newsletterOpen]);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  return (
    <div className={`app-shell${isLightTheme ? " theme-light" : ""}`}>
      <Header
        cartCount={count}
        onCart={() => setCartOpen(true)}
        onMenu={() => setMenuOpen(true)}
        onSearch={setQuery}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        onNavigate={navigateTo}
      />
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewsletter={() => setNewsletterOpen(true)}
        categories={catalog.categories}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
        isLightTheme={isLightTheme}
        onToggleTheme={() => setIsLightTheme((current) => !current)}
        onNavigate={navigateTo}
        isSignedIn={accountStatus === "signed-in"}
        onSignOut={signOut}
      />
      {!checkout ? (
        isAccountCallback || isAccountPage ? (
          <AccountPage
            accountStatus={accountStatus}
            customer={accountCustomer}
            accountError={accountError}
            isOrdersPage={isOrdersPage}
            orders={orders}
            ordersStatus={ordersStatus}
            ordersError={ordersError}
            onShopSignIn={signInWithShop}
            onSignOut={signOut}
            onLoadMoreOrders={loadMoreOrders}
            hasMoreOrders={ordersPageInfo.hasNextPage}
            onNavigate={navigateTo}
          />
        ) : isAboutPage ? (
          <AboutPage onNavigate={navigateTo} />
        ) : isArchivePage ? (
          <ArchivePage />
        ) : selected ? (
          <ProductDetail
            product={selected}
            onBack={() => setSelected(null)}
            addToCart={addToCart}
          />
        ) : (
          <>
            <main className="shop-section" id="shop">
              {(query.trim() || activeCategoryName) && (
                <div className="section-heading">
                  <h2>{query.trim() ? "SEARCH RESULTS" : activeCategoryName}</h2>
                </div>
              )}
              {catalogStatus === "loading" ? (
                <div className="catalog-loader" role="status" aria-label="Loading products">
                  <img src="/images/logo-clean.svg" alt="" />
                  <p>LOADING PRODUCTS…</p>
                </div>
              ) : catalogStatus === "error" ? (
                <p className="no-results">
                  {isShopifyConfigured
                    ? "SHOPIFY COULDN’T LOAD PRODUCTS. PLEASE TRY AGAIN LATER."
                    : "SHOPIFY ISN’T CONFIGURED. PRODUCTS CAN’T BE LOADED."}
                </p>
              ) : filtered.length ? (
                <>
                  <div className="product-grid">
                    {filtered.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                  {catalog.pageInfo.hasNextPage && (
                    <div className="pagination">
                      {paginationError && (
                        <p className="pagination-error" role="alert">
                          {paginationError}
                        </p>
                      )}
                      <button
                        className="button-outline"
                        onClick={loadMoreProducts}
                        disabled={paginationStatus === "loading"}
                      >
                        {paginationStatus === "loading"
                          ? "LOADING…"
                          : "LOAD MORE"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="no-results">
                    {catalog.pageInfo.hasNextPage
                      ? "NO MATCHING PRODUCTS IN THE PRODUCTS LOADED SO FAR."
                      : "NO PRODUCTS FOUND. TRY ANOTHER SEARCH."}
                  </p>
                  {catalog.pageInfo.hasNextPage && (
                    <div className="pagination">
                      {paginationError && (
                        <p className="pagination-error" role="alert">
                          {paginationError}
                        </p>
                      )}
                      <button
                        className="button-outline"
                        onClick={loadMoreProducts}
                        disabled={paginationStatus === "loading"}
                      >
                        {paginationStatus === "loading"
                          ? "LOADING…"
                          : query.trim()
                            ? "LOAD MORE TO CONTINUE SEARCHING"
                            : "LOAD MORE PRODUCTS"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
            <footer className="site-footer">
              <p>PRESSURE RAISED ME.</p>
              <p>© 2026 RAIZED® — MUMBAI, INDIA. ALL RIGHTS RESERVED.</p>
            </footer>
          </>
        )
      ) : (
        <Checkout
          cart={cart}
          onBack={() => setCheckout(false)}
          onContinue={continueToShopifyCheckout}
          isProcessing={checkoutStatus === "loading"}
          checkoutError={checkoutError}
        />
      )}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        changeQty={changeQty}
        onCheckout={() => {
          setCartOpen(false);
          setCheckout(true);
        }}
      />
      {newsletterOpen && (
        <div
          className="newsletter-modal-backdrop"
          onClick={() => setNewsletterOpen(false)}
        >
          <section
            className="newsletter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="newsletter-modal-close"
              onClick={() => setNewsletterOpen(false)}
              aria-label="Close newsletter signup"
            >
              <X size={20} />
            </button>
            <p className="eyebrow">STAY IN THE LOOP</p>
            <h2 id="newsletter-title">NO NOISE. JUST THE DROP.</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNewsletterOpen(false);
                setNotice("YOU’RE ON THE LIST.");
                e.currentTarget.reset();
              }}
            >
              <input
                type="email"
                required
                placeholder="YOUR EMAIL ADDRESS"
                aria-label="Your email address"
                autoFocus
              />
              <button className="button-yellow">SUBSCRIBE ↗</button>
            </form>
            <p className="newsletter-note">
              EARLY ACCESS. DROP UPDATES. NOTHING ELSE.
            </p>
          </section>
        </div>
      )}
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice} <X size={13} />
        </button>
      )}
    </div>
  );
}
