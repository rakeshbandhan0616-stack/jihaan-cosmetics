import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ShopByCategory.module.css";

type Category = {
  _id?: string;
  id?: string;
  name: string;
  image: string;
  description?: string;
  isActive?: boolean;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/$/, "");

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const getCategoryId = (category: Category): string => {
  return String(category._id || category.id || category.name);
};

const getImageUrl = (image?: string): string => {
  if (!image) {
    return "/images/category-placeholder.png";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${SERVER_BASE_URL}${image}`;
  }

  return `${SERVER_BASE_URL}/${image}`;
};

function ShopByCategory() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/categories`);
        const responseText = await response.text();

        let data: {
          success?: boolean;
          data?: Category[];
          categories?: Category[];
          message?: string;
        } = {};

        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error("Server returned an invalid response.");
        }

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch categories.");
        }

        const receivedCategories = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.categories)
            ? data.categories
            : [];

        const activeCategories = receivedCategories.filter(
          (category) => category.isActive !== false,
        );

        if (isMounted) {
          setCategories(activeCategories);
        }
      } catch (fetchError) {
        console.error("Fetch categories error:", fetchError);

        if (isMounted) {
          setError("Unable to load categories. Please try again.");
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    const categoryPath = encodeURIComponent(
      categoryName.trim().replace(/\s+/g, " "),
    );

    navigate(`/category/${categoryPath}`);
  };

  return (
    <section className={styles.section} id="collections">
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div className={styles.headingContent}>
            <span className={styles.eyebrow}>
              DISCOVER YOUR BEAUTY RITUAL
            </span>

            <h2 className={styles.title}>SHOP BY CATEGORY</h2>

            <span className={styles.headingLine} />
          </div>

          {!loading && categories.length > 0 && (
            <button
              type="button"
              className={styles.viewAllButton}
              onClick={() =>
                setShowAllCategories((previous) => !previous)
              }
              aria-expanded={showAllCategories}
            >
              {showAllCategories ? "Show Less" : "View All"}
            </button>
          )}
        </div>

        {loading && (
          <div className={styles.loadingState}>Loading categories...</div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>{error}</div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className={styles.emptyState}>No categories available.</div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div
            className={
              showAllCategories
                ? styles.categoryGrid
                : styles.categoryScroller
            }
            id={showAllCategories ? "all-categories" : undefined}
          >
            {categories.map((category) => {
              const categoryId = getCategoryId(category);
              const categoryImage = getImageUrl(category.image);

              return (
                <button
                  type="button"
                  className={styles.categoryItem}
                  key={categoryId}
                  onClick={() => handleCategoryClick(category.name)}
                  aria-label={`Shop ${category.name} products`}
                >
                  <div className={styles.categoryCard}>
                    <div className={styles.imageWrapper}>
                      <img
                        src={categoryImage}
                        alt={category.name}
                        className={styles.categoryImage}
                        loading="lazy"
                        onError={(event) => {
                          const image = event.currentTarget;

                          image.onerror = null;
                          image.src =
                            "/images/category-placeholder.png";
                        }}
                      />
                    </div>

                    <h3 className={styles.categoryLabel}>
                      {category.name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ShopByCategory;