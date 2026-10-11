const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();
const accessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();
const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION?.trim() || "2026-10";

export const isShopifyConfigured = Boolean(domain && accessToken);

const storefrontUrl = () => {
  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${normalizedDomain}/api/${apiVersion}/graphql.json`;
};

async function storefrontRequest(query, variables = {}) {
  if (!isShopifyConfigured) {
    throw new Error("Shopify is not configured.");
  }

  const response = await fetch(storefrontUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify request failed (${response.status}).`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map(({ message }) => message).join(" "));
  }
  return payload.data;
}

const PRODUCT_FIELDS = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    featuredImage { url altText }
    priceRange { minVariantPrice { amount currencyCode } }
    options { name values }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        selectedOptions { name value }
        image { url altText }
      }
    }
    collections(first: 100) { nodes { handle } }
  }
`;

const SHOP_QUERY = `
  query StorefrontCatalog {
    collections(first: 100, sortKey: TITLE) {
      nodes {
        id
        handle
        title
      }
    }
    products(first: 24, sortKey: CREATED_AT, reverse: true) {
      nodes { ...ProductFields }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_FIELDS}
`;

const PRODUCTS_PAGE_QUERY = `
  query StorefrontProductsPage($after: String!) {
    products(first: 24, after: $after, sortKey: CREATED_AT, reverse: true) {
      nodes { ...ProductFields }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRODUCT_FIELDS}
`;

const CREATE_CART_MUTATION = `
  mutation CreateCart($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function mapProduct(product) {
  const variants = product.variants.nodes;
  const sizeOption = product.options.find((option) => option.name.toLowerCase() === "size");
  const availableVariants = variants.filter((variant) => variant.availableForSale);

  return {
    id: product.id,
    handle: product.handle,
    name: product.title,
    colour:
      product.options.find((option) => /colou?r/i.test(option.name))?.values[0] || "",
    price: Number(product.priceRange.minVariantPrice.amount),
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
    image: product.featuredImage?.url || variants[0]?.image?.url || "",
    imageAlt: product.featuredImage?.altText || product.title,
    tag: "SHOPIFY",
    sizes: sizeOption?.values || [],
    variants: availableVariants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      selectedOptions: variant.selectedOptions,
    })),
    description: product.description || "",
    collectionHandles: product.collections.nodes.map((collection) => collection.handle),
  };
}

export async function getShopifyCatalog() {
  const data = await storefrontRequest(SHOP_QUERY);
  return {
    categories: data.collections.nodes.map((collection) => ({
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
    })),
    products: data.products.nodes.map(mapProduct),
    pageInfo: data.products.pageInfo,
  };
}

export async function getShopifyProductsPage(after) {
  if (!after) {
    throw new Error("A cursor is required to load the next product page.");
  }
  const data = await storefrontRequest(PRODUCTS_PAGE_QUERY, { after });
  return {
    products: data.products.nodes.map(mapProduct),
    pageInfo: data.products.pageInfo,
  };
}

export async function createShopifyCheckout(cartItems) {
  const lines = cartItems.map((item) => {
    const variant = item.variants?.find((candidate) =>
      candidate.selectedOptions?.some(
        (option) =>
          option.name.toLowerCase() === "size" && option.value === item.size,
      ),
    );
    if (!variant) {
      throw new Error(`Could not find the Shopify variant for ${item.name}.`);
    }
    return { merchandiseId: variant.id, quantity: item.qty };
  });
  if (!lines.length) {
    throw new Error("Your bag is empty.");
  }

  const data = await storefrontRequest(CREATE_CART_MUTATION, {
    input: { lines },
  });
  const { cart, userErrors } = data.cartCreate;
  if (userErrors.length) {
    throw new Error(userErrors.map(({ message }) => message).join(" "));
  }
  if (!cart?.checkoutUrl) {
    throw new Error("Shopify did not return a checkout link.");
  }
  return cart.checkoutUrl;
}
