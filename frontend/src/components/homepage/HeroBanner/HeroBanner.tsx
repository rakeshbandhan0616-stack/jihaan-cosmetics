import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import styles from "./HeroBanner.module.css";

type HeroSlide = {
  id: string | number;
  type: "image" | "video";
  desktopSrc: string;
  mobileSrc?: string;
  alt: string;
};

type ApiBanner = {
  _id?: string;
  id?: string | number;
  type?: string;
  mediaType?: string;
  desktopSrc?: string;
  mobileSrc?: string;
  mediaUrl?: string;
  mobileMediaUrl?: string;
  url?: string;
  title?: string;
  alt?: string;
  isActive?: boolean;
  active?: boolean;
  displayOrder?: number;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  banners?: ApiBanner[];
  data?: ApiBanner[] | { banners?: ApiBanner[] };
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    type: "image",
    desktopSrc:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=2200&q=85",
    mobileSrc:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85",
    alt: "Cosmetics and beauty products",
  },
  {
    id: "fallback-2",
    type: "image",
    desktopSrc:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=2200&q=85",
    mobileSrc:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85",
    alt: "Makeup products and brushes",
  },
  {
    id: "fallback-3",
    type: "image",
    desktopSrc:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=2200&q=85",
    mobileSrc:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=85",
    alt: "Beauty portrait",
  },
];

const IMAGE_DURATION = 4000;

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/$/, "");

const HERO_BANNERS_ENDPOINT = `${API_BASE_URL}/hero-banners`;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const getResponseBanners = (data: unknown): ApiBanner[] => {
  if (Array.isArray(data)) {
    return data as ApiBanner[];
  }

  if (!isObject(data)) {
    return [];
  }

  if (Array.isArray(data.banners)) {
    return data.banners as ApiBanner[];
  }

  if (isObject(data.data) && Array.isArray(data.data.banners)) {
    return data.data.banners as ApiBanner[];
  }

  if (Array.isArray(data.data)) {
    return data.data as ApiBanner[];
  }

  return [];
};

const getSlides = (items: unknown): HeroSlide[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index): HeroSlide | null => {
      if (!isObject(item)) {
        return null;
      }

      const banner = item as ApiBanner;

      const rawType = banner.type || banner.mediaType || "image";

      const type: "image" | "video" =
        rawType.toLowerCase() === "video" ? "video" : "image";

      const desktopSrc =
        typeof banner.desktopSrc === "string" && banner.desktopSrc.trim()
          ? banner.desktopSrc.trim()
          : typeof banner.mediaUrl === "string" && banner.mediaUrl.trim()
            ? banner.mediaUrl.trim()
            : typeof banner.url === "string" && banner.url.trim()
              ? banner.url.trim()
              : "";

      if (!desktopSrc) {
        return null;
      }

      const mobileSrc =
        typeof banner.mobileSrc === "string" && banner.mobileSrc.trim()
          ? banner.mobileSrc.trim()
          : typeof banner.mobileMediaUrl === "string" &&
              banner.mobileMediaUrl.trim()
            ? banner.mobileMediaUrl.trim()
            : undefined;

      const id =
        typeof banner._id === "string" && banner._id.trim()
          ? banner._id
          : typeof banner.id === "string" || typeof banner.id === "number"
            ? banner.id
            : `banner-${index}`;

      const alt =
        typeof banner.alt === "string" && banner.alt.trim()
          ? banner.alt.trim()
          : typeof banner.title === "string" && banner.title.trim()
            ? banner.title.trim()
            : "Jihaan Beauty promotional banner";

      return {
        id,
        type,
        desktopSrc,
        mobileSrc,
        alt,
      };
    })
    .filter((slide): slide is HeroSlide => slide !== null);
};

const HeroBanner = () => {
  const [heroSlides, setHeroSlides] =
    useState<HeroSlide[]>(FALLBACK_SLIDES);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoErrorTimerRef = useRef<number | null>(null);

  const activeSlide = heroSlides[activeIndex] ?? heroSlides[0];

  useEffect(() => {
    let isMounted = true;

    const fetchHeroBanners = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(HERO_BANNERS_ENDPOINT, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const data: unknown = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorData = data as ApiResponse;

          throw new Error(
            errorData.message ||
              errorData.error ||
              `Request failed with status ${response.status}`,
          );
        }

        const rawBanners = getResponseBanners(data);

        const activeBanners = rawBanners
          .filter((banner) => {
            return banner.isActive !== false && banner.active !== false;
          })
          .sort((firstBanner, secondBanner) => {
            return (
              (firstBanner.displayOrder ?? 0) -
              (secondBanner.displayOrder ?? 0)
            );
          });

        const serverSlides = getSlides(activeBanners);

        if (!isMounted) {
          return;
        }

        if (serverSlides.length > 0) {
          setHeroSlides(serverSlides);
        } else {
          setHeroSlides(FALLBACK_SLIDES);
        }

        setActiveIndex(0);
      } catch (error) {
        console.warn(
          "Unable to load hero banners. Using fallback slides.",
          error,
        );

        if (isMounted) {
          setHeroSlides(FALLBACK_SLIDES);
          setActiveIndex(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchHeroBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlide || heroSlides.length <= 1) {
      return;
    }

    if (activeSlide.type !== "image") {
      return;
    }

    const imageTimer = window.setTimeout(() => {
      setActiveIndex((currentIndex) => {
        return (currentIndex + 1) % heroSlides.length;
      });
    }, IMAGE_DURATION);

    return () => {
      window.clearTimeout(imageTimer);
    };
  }, [activeIndex, activeSlide, heroSlides.length]);

  useEffect(() => {
    if (!activeSlide || activeSlide.type !== "video") {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = isMuted;
    video.currentTime = 0;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        if (
          !(
            error instanceof DOMException &&
            error.name === "AbortError"
          )
        ) {
          console.warn("Video autoplay was blocked:", error);
        }
      }
    };

    void playVideo();
  }, [activeIndex, activeSlide, isMuted]);

  useEffect(() => {
    return () => {
      if (videoErrorTimerRef.current !== null) {
        window.clearTimeout(videoErrorTimerRef.current);
      }
    };
  }, []);

  const nextSlide = () => {
    setActiveIndex((currentIndex) => {
      return (currentIndex + 1) % heroSlides.length;
    });
  };

  const previousSlide = () => {
    setActiveIndex((currentIndex) => {
      return (
        (currentIndex - 1 + heroSlides.length) % heroSlides.length
      );
    });
  };

  const handleVideoEnded = () => {
    nextSlide();
  };

  const handleVideoError = (
    event: SyntheticEvent<HTMLVideoElement, Event>,
  ) => {
    const video = event.currentTarget;

    console.error("Hero video could not be loaded.", {
      source: video.currentSrc,
      errorCode: video.error?.code,
      errorMessage: video.error?.message,
    });

    if (videoErrorTimerRef.current !== null) {
      window.clearTimeout(videoErrorTimerRef.current);
    }

    videoErrorTimerRef.current = window.setTimeout(() => {
      nextSlide();
    }, 500);
  };

  const handleImageError = (
    event: SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    const image = event.currentTarget;

    if (image.src === FALLBACK_SLIDES[0].desktopSrc) {
      return;
    }

    image.src = FALLBACK_SLIDES[0].desktopSrc;
  };

  if (!activeSlide) {
    return null;
  }

  return (
    <section
      className={styles.hero}
      aria-label="Featured beauty promotions"
    >
      <div className={styles.mediaContainer}>
        {activeSlide.type === "video" ? (
          <video
            key={`video-${activeSlide.id}`}
            ref={videoRef}
            className={styles.media}
            autoPlay
            muted={isMuted}
            playsInline
            controls={false}
            preload="auto"
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            aria-label={activeSlide.alt}
          >
            <source src={activeSlide.desktopSrc} />
            Your browser does not support HTML video.
          </video>
        ) : (
          <picture key={`image-${activeSlide.id}`}>
            {activeSlide.mobileSrc && (
              <source
                media="(max-width: 600px)"
                srcSet={activeSlide.mobileSrc}
              />
            )}

            <img
              className={styles.media}
              src={activeSlide.desktopSrc}
              alt={activeSlide.alt}
              loading={activeIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              onError={handleImageError}
            />
          </picture>
        )}

        {activeSlide.type === "video" && (
          <button
            type="button"
            className={styles.muteButton}
            onClick={() => {
              setIsMuted((currentValue) => !currentValue);
            }}
            aria-label={
              isMuted
                ? "Unmute promotional video"
                : "Mute promotional video"
            }
            aria-pressed={!isMuted}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        )}
      </div>

      {heroSlides.length > 1 && (
        <div className={styles.sliderControls}>
          <button
            type="button"
            className={`${styles.arrow} ${styles.previousArrow}`}
            onClick={previousSlide}
            aria-label="Previous banner"
          >
            ‹
          </button>

          <div className={styles.dots} aria-label="Banner navigation">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`${styles.dot} ${
                  index === activeIndex ? styles.activeDot : ""
                }`}
                onClick={() => {
                  setActiveIndex(index);
                }}
                aria-label={`Show banner ${index + 1}`}
                aria-current={
                  index === activeIndex ? "true" : undefined
                }
              />
            ))}
          </div>

          <button
            type="button"
            className={`${styles.arrow} ${styles.nextArrow}`}
            onClick={nextSlide}
            aria-label="Next banner"
          >
            ›
          </button>
        </div>
      )}

      {isLoading && (
        <span className={styles.loadingText}>Loading banners…</span>
      )}
    </section>
  );
};

export default HeroBanner;