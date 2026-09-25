import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import MainHeader from "../../header/MainHeader/MainHeader";
import Footer from "../../footer/Footer";
import ProductCard from "../../ProductCard/ProductCard";

import styles from "./CategoryProductsPage.module.css";

interface Product {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  images?: string[];
  price?: number;
  oldPrice?: number;
  category?: string;
  description?: string;
  brand?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductsResponse {
  success?: boolean;
  products?: Product[];
  data?: Product[];
  items?: Product[];
}

type PriceRange = "all" | "under-500" | "500-1000" | "1000-2000" | "above-2000";

type SortOption =
  | "default"
  | "az"
  | "za"
  | "newest"
  | "oldest";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const getProductPrice = (product: Product): number => {
  return Number(product.price || product.oldPrice || 0);
};

const CategoryProductsPage = () => {
  const { categoryName } = useParams<{
    categoryName: string;
  }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [sortOption, setSortOption] =
    useState<SortOption>("default");

  const category = useMemo(() => {
    return decodeURIComponent(categoryName || "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [categoryName]);

  const pageTitle = useMemo(() => {
    if (!category) {
      return "Products";
    }

    return category
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(" ");
  }, [category]);

  useEffect(() => {
    const fetchCategoryProducts = async (): Promise<void> => {
      if (!category) {
        setProducts([]);
        setError("Category not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get<ProductsResponse>(
          `${API_BASE_URL}/products`,
          {
            params: {
              category,
            },
          },
        );

        const fetchedProducts =
          response.data.products ||
          response.data.data ||
          response.data.items ||
          [];

        setProducts(
          Array.isArray(fetchedProducts) ? fetchedProducts : [],
        );
      } catch (err) {
        console.error("Category products error:", err);
        setError("Unable to load products. Please try again.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchCategoryProducts();
  }, [category]);

  const filteredAndSortedProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => {
      const price = getProductPrice(product);

      switch (priceRange) {
        case "under-500":
          return price < 500;

        case "500-1000":
          return price >= 500 && price <= 1000;

        case "1000-2000":
          return price > 1000 && price <= 2000;

        case "above-2000":
          return price > 2000;

        case "all":
        default:
          return true;
      }
    });

    return [...filteredProducts].sort((firstProduct, secondProduct) => {
      switch (sortOption) {
        case "az":
          return firstProduct.name.localeCompare(
            secondProduct.name,
            undefined,
            {
              sensitivity: "base",
            },
          );

        case "za":
          return secondProduct.name.localeCompare(
            firstProduct.name,
            undefined,
            {
              sensitivity: "base",
            },
          );

        case "newest":
          return (
            new Date(secondProduct.createdAt || 0).getTime() -
            new Date(firstProduct.createdAt || 0).getTime()
          );

        case "oldest":
          return (
            new Date(firstProduct.createdAt || 0).getTime() -
            new Date(secondProduct.createdAt || 0).getTime()
          );

        case "default":
        default:
          return 0;
      }
    });
  }, [products, priceRange, sortOption]);

  const resetFilters = (): void => {
    setPriceRange("all");
    setSortOption("default");
  };

  return (
    <>
      <MainHeader />

      <main className={styles.page}>
        <section className={styles.header}>
          <p className={styles.eyebrow}>
            Explore our collection
          </p>

          <h1 className={styles.title}>{pageTitle}</h1>

          <p className={styles.description}>
            Discover our carefully selected products in the{" "}
            {pageTitle.toLowerCase()} category.
          </p>
        </section>

        <section className={styles.productsSection}>
          <div className={styles.productsTopbar}>
            <p className={styles.resultCount}>
              {loading
                ? "Loading products..."
                : `${filteredAndSortedProducts.length} ${
                    filteredAndSortedProducts.length === 1
                      ? "product"
                      : "products"
                  } found`}
            </p>

            <div className={styles.filterActions}>
              <select
                className={styles.filterSelect}
                value={priceRange}
                onChange={(event) =>
                  setPriceRange(event.target.value as PriceRange)
                }
                aria-label="Filter products by price range"
              >
                <option value="all">All Prices</option>
                <option value="under-500">Under ₹500</option>
                <option value="500-1000">₹500 – ₹1,000</option>
                <option value="1000-2000">₹1,000 – ₹2,000</option>
                <option value="above-2000">Above ₹2,000</option>
              </select>

              <select
                className={styles.filterSelect}
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
                aria-label="Sort products"
              >
                <option value="default">Sort By</option>
                <option value="az">Alphabetical: A–Z</option>
                <option value="za">Alphabetical: Z–A</option>
                <option value="newest">New to Old</option>
                <option value="oldest">Old to New</option>
              </select>

              {(priceRange !== "all" || sortOption !== "default") && (
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={resetFilters}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.status}>
              Loading products...
            </div>
          ) : error ? (
            <div className={`${styles.status} ${styles.error}`}>
              {error}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No products found</h2>

              <p>
                No products match your selected filters in this
                category.
              </p>

              <button
                type="button"
                className={styles.resetButton}
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {filteredAndSortedProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default CategoryProductsPage;