import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  SyntheticEvent,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Link } from "react-router-dom";

import styles from "./HeroBanner.module.css";

/* =========================================================
   TYPES
========================================================= */

type HeroSlide = {
  id: string | number;

  type: "image" | "video";

  desktopSrc: string;

  mobileSrc?: string;

  title?: string;

  description?: string;

  buttonText?: string;

  productId?: string;

  productSlug?: string;

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

  description?: string;

  buttonText?: string;

  productId?: string;

  productSlug?: string;

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

  banner?: ApiBanner;

  data?:
    | ApiBanner[]
    | ApiBanner
    | {
        banners?: ApiBanner[];
      };
};

/* =========================================================
   SETTINGS
========================================================= */

const IMAGE_DURATION = 5000;

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/$/, "");

const HERO_BANNERS_ENDPOINT =
  `${API_BASE_URL}/hero-banners`;

/* =========================================================
   HELPERS
========================================================= */

const isObject = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

/* =========================================================
   GET BANNERS FROM API RESPONSE
========================================================= */

const getResponseBanners = (
  data: unknown,
): ApiBanner[] => {
  if (Array.isArray(data)) {
    return data as ApiBanner[];
  }

  if (!isObject(data)) {
    return [];
  }

  if (Array.isArray(data.banners)) {
    return data.banners as ApiBanner[];
  }

  if (
    isObject(data.data) &&
    Array.isArray(data.data.banners)
  ) {
    return data.data.banners as ApiBanner[];
  }

  if (Array.isArray(data.data)) {
    return data.data as ApiBanner[];
  }

  if (
    isObject(data.banner)
  ) {
    return [
      data.banner as ApiBanner,
    ];
  }

  if (
    isObject(data.data)
  ) {
    return [
      data.data as ApiBanner,
    ];
  }

  return [];
};

/* =========================================================
   CONVERT API BANNER TO FRONTEND SLIDE
========================================================= */

const getSlides = (
  items: unknown,
): HeroSlide[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(
      (
        item,
        index,
      ): HeroSlide | null => {
        if (!isObject(item)) {
          return null;
        }

        const banner =
          item as ApiBanner;

        /* -----------------------------------------------
           TYPE
        ------------------------------------------------ */

        const rawType =
          banner.type ||
          banner.mediaType ||
          "image";

        const type:
          | "image"
          | "video" =
          rawType.toLowerCase() ===
          "video"
            ? "video"
            : "image";

        /* -----------------------------------------------
           DESKTOP MEDIA
        ------------------------------------------------ */

        const desktopSrc =
          typeof banner.desktopSrc ===
              "string" &&
          banner.desktopSrc.trim()
            ? banner.desktopSrc.trim()
            : typeof banner.mediaUrl ===
                  "string" &&
                banner.mediaUrl.trim()
              ? banner.mediaUrl.trim()
              : typeof banner.url ===
                    "string" &&
                  banner.url.trim()
                ? banner.url.trim()
                : "";

        /*
         * IMPORTANT:
         * Do not create a fake/sample image.
         *
         * If there is no desktop media,
         * this banner is simply ignored.
         */

        if (!desktopSrc) {
          return null;
        }

        /* -----------------------------------------------
           MOBILE MEDIA
        ------------------------------------------------ */

        const mobileSrc =
          typeof banner.mobileSrc ===
              "string" &&
          banner.mobileSrc.trim()
            ? banner.mobileSrc.trim()
            : typeof banner.mobileMediaUrl ===
                  "string" &&
                banner.mobileMediaUrl.trim()
              ? banner.mobileMediaUrl.trim()
              : undefined;

        /* -----------------------------------------------
           ID
        ------------------------------------------------ */

        const id =
          typeof banner._id ===
              "string" &&
          banner._id.trim()
            ? banner._id
            : typeof banner.id ===
                    "string" ||
                typeof banner.id ===
                    "number"
              ? banner.id
              : `banner-${index}`;

        /* -----------------------------------------------
           TEXT
        ------------------------------------------------ */

        const title =
          typeof banner.title ===
              "string" &&
          banner.title.trim()
            ? banner.title.trim()
            : undefined;

        const description =
          typeof banner.description ===
              "string" &&
          banner.description.trim()
            ? banner.description.trim()
            : undefined;

        const buttonText =
          typeof banner.buttonText ===
              "string" &&
          banner.buttonText.trim()
            ? banner.buttonText.trim()
            : undefined;

        /* -----------------------------------------------
           PRODUCT
        ------------------------------------------------ */

        const productId =
          typeof banner.productId ===
              "string" &&
          banner.productId.trim()
            ? banner.productId.trim()
            : undefined;

        const productSlug =
          typeof banner.productSlug ===
              "string" &&
          banner.productSlug.trim()
            ? banner.productSlug.trim()
            : undefined;

        /* -----------------------------------------------
           ALT
        ------------------------------------------------ */

        const alt =
          typeof banner.alt ===
              "string" &&
          banner.alt.trim()
            ? banner.alt.trim()
            : title ||
              "Jihaan Cosmetics promotional banner";

        return {
          id,

          type,

          desktopSrc,

          mobileSrc,

          title,

          description,

          buttonText,

          productId,

          productSlug,

          alt,
        };
      },
    )
    .filter(
      (
        slide,
      ): slide is HeroSlide =>
        slide !== null,
    );
};

/* =========================================================
   PRODUCT / BUTTON URL
========================================================= */

const getButtonHref = (
  slide: HeroSlide,
): string => {
  /* -----------------------------------------------
     Product slug already contains route
     Example:
     /product/brightening-serum
  ------------------------------------------------ */

  if (
    slide.productSlug
  ) {
    if (
      slide.productSlug.startsWith(
        "/",
      )
    ) {
      return slide.productSlug;
    }

    return `/product/${slide.productSlug}`;
  }

  /* -----------------------------------------------
     Product ID fallback
  ------------------------------------------------ */

  if (
    slide.productId
  ) {
    return `/product/${slide.productId}`;
  }

  /* -----------------------------------------------
     General shop fallback
  ------------------------------------------------ */

  return "/shop";
};

/* =========================================================
   COMPONENT
========================================================= */

const HeroBanner = () => {
  const [
    heroSlides,
    setHeroSlides,
  ] = useState<HeroSlide[]>([]);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    isMuted,
    setIsMuted,
  ] = useState(true);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    hasError,
    setHasError,
  ] = useState(false);

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const videoErrorTimerRef =
    useRef<number | null>(
      null,
    );

  const activeSlide =
    heroSlides[
      activeIndex
    ] ?? null;

  /* =======================================================
     FETCH HERO BANNERS
  ======================================================= */

  useEffect(() => {
    let isMounted = true;

    const fetchHeroBanners =
      async () => {
        try {
          setIsLoading(true);

          setHasError(false);

          const response =
            await fetch(
              HERO_BANNERS_ENDPOINT,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const data: unknown =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            const errorData =
              data as ApiResponse;

            throw new Error(
              errorData.message ||
                errorData.error ||
                `Request failed with status ${response.status}`,
            );
          }

          const rawBanners =
            getResponseBanners(
              data,
            );

          /* ---------------------------------------------
             ACTIVE BANNERS ONLY
          ---------------------------------------------- */

          const activeBanners =
            rawBanners
              .filter(
                (
                  banner,
                ) => {
                  return (
                    banner.isActive !==
                      false &&
                    banner.active !==
                      false
                  );
                },
              )
              .sort(
                (
                  firstBanner,
                  secondBanner,
                ) => {
                  return (
                    (firstBanner.displayOrder ??
                      0) -
                    (secondBanner.displayOrder ??
                      0)
                  );
                },
              );

          const serverSlides =
            getSlides(
              activeBanners,
            );

          if (!isMounted) {
            return;
          }

          /*
           * IMPORTANT:
           *
           * If there are no banners,
           * keep the array EMPTY.
           *
           * DO NOT add sample images.
           */

          setHeroSlides(
            serverSlides,
          );

          setActiveIndex(0);

          setHasError(false);
        } catch (error) {
          console.warn(
            "Unable to load hero banners:",
            error,
          );

          if (isMounted) {
            /*
             * NO FALLBACK IMAGES
             */
            setHeroSlides([]);

            setActiveIndex(0);

            setHasError(true);
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

  /* =======================================================
     AUTO SLIDER FOR IMAGES
  ======================================================= */

  useEffect(() => {
    if (
      !activeSlide ||
      heroSlides.length <= 1
    ) {
      return;
    }

    /*
     * Videos advance when video ends.
     */
    if (
      activeSlide.type ===
      "video"
    ) {
      return;
    }

    const imageTimer =
      window.setTimeout(
        () => {
          setActiveIndex(
            (
              currentIndex,
            ) => {
              return (
                (currentIndex + 1) %
                heroSlides.length
              );
            },
          );
        },
        IMAGE_DURATION,
      );

    return () => {
      window.clearTimeout(
        imageTimer,
      );
    };
  }, [
    activeIndex,
    activeSlide,
    heroSlides.length,
  ]);

  /* =======================================================
     VIDEO PLAY
  ======================================================= */

  useEffect(() => {
    if (
      !activeSlide ||
      activeSlide.type !==
        "video"
    ) {
      return;
    }

    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.muted =
      isMuted;

    video.currentTime = 0;

    const playVideo =
      async () => {
        try {
          await video.play();
        } catch (error) {
          if (
            !(
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            )
          ) {
            console.warn(
              "Video autoplay was blocked:",
              error,
            );
          }
        }
      };

    void playVideo();
  }, [
    activeIndex,
    activeSlide,
    isMuted,
  ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        videoErrorTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          videoErrorTimerRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     NEXT
  ======================================================= */

  const nextSlide = () => {
    if (
      heroSlides.length <= 1
    ) {
      return;
    }

    setActiveIndex(
      (
        currentIndex,
      ) => {
        return (
          (currentIndex + 1) %
          heroSlides.length
        );
      },
    );
  };

  /* =======================================================
     PREVIOUS
  ======================================================= */

  const previousSlide = () => {
    if (
      heroSlides.length <= 1
    ) {
      return;
    }

    setActiveIndex(
      (
        currentIndex,
      ) => {
        return (
          (currentIndex -
            1 +
            heroSlides.length) %
          heroSlides.length
        );
      },
    );
  };

  /* =======================================================
     VIDEO ENDED
  ======================================================= */

  const handleVideoEnded =
    () => {
      nextSlide();
    };

  /* =======================================================
     VIDEO ERROR
  ======================================================= */

  const handleVideoError = (
    event: SyntheticEvent<
      HTMLVideoElement,
      Event
    >,
  ) => {
    const video =
      event.currentTarget;

    console.error(
      "Hero video could not be loaded.",
      {
        source:
          video.currentSrc,

        errorCode:
          video.error?.code,

        errorMessage:
          video.error?.message,
      },
    );

    if (
      videoErrorTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        videoErrorTimerRef.current,
      );
    }

    videoErrorTimerRef.current =
      window.setTimeout(
        () => {
          nextSlide();
        },
        500,
      );
  };

  /* =======================================================
     IMAGE ERROR
  ======================================================= */

  const handleImageError = (
    event: SyntheticEvent<
      HTMLImageElement,
      Event
    >,
  ) => {
    const image =
      event.currentTarget;

    console.error(
      "Hero banner image could not be loaded:",
      image.src,
    );

    /*
     * IMPORTANT:
     *
     * We do NOT replace it
     * with a sample image.
     *
     * Move to next banner instead.
     */

    if (
      heroSlides.length > 1
    ) {
      nextSlide();
    }
  };

  /* =======================================================
     NO BANNER STATE
  ======================================================= */

  if (
    !isLoading &&
    heroSlides.length === 0
  ) {
    return (
      <section
        className={
          styles.emptyHero
        }
        aria-label="Hero banner"
      >
        <div
          className={
            styles.emptyHeroContent
          }
        >
          <span
            className={
              styles.emptyHeroEyebrow
            }
          >
            JINI COSMETICS
          </span>

          <h1
            className={
              styles.emptyHeroTitle
            }
          >
            No Banner Available
          </h1>

          <p
            className={
              styles.emptyHeroText
            }
          >
            Promotional banner
            will appear here
            once it is added.
          </p>
        </div>
      </section>
    );
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (
    isLoading &&
    !activeSlide
  ) {
    return (
      <section
        className={
          styles.loadingHero
        }
        aria-label="Loading hero banner"
      >
        <div
          className={
            styles.loadingContent
          }
        >
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  /* =======================================================
     SAFETY
  ======================================================= */

  if (!activeSlide) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className={styles.hero}
      aria-label="Featured beauty promotions"
    >
      <div
        className={
          styles.mediaContainer
        }
      >
        {/* =================================================
            IMAGE
        ================================================= */}

        {activeSlide.type ===
        "image" ? (
          <picture
            key={`image-${activeSlide.id}`}
            className={
              styles.picture
            }
          >
            {activeSlide.mobileSrc && (
              <source
                media="(max-width: 768px)"
                srcSet={
                  activeSlide.mobileSrc
                }
              />
            )}

            <img
              className={
                styles.media
              }
              src={
                activeSlide.desktopSrc
              }
              alt={
                activeSlide.alt
              }
              loading={
                activeIndex === 0
                  ? "eager"
                  : "lazy"
              }
              decoding="async"
              onError={
                handleImageError
              }
            />
          </picture>
        ) : (
          /* =================================================
             VIDEO
          ================================================= */

          <video
            key={`video-${activeSlide.id}`}
            ref={videoRef}
            className={
              styles.media
            }
            autoPlay
            muted={isMuted}
            playsInline
            controls={false}
            preload="auto"
            onEnded={
              handleVideoEnded
            }
            onError={
              handleVideoError
            }
            aria-label={
              activeSlide.alt
            }
          >
            {activeSlide.mobileSrc && (
              <source
                src={
                  activeSlide.mobileSrc
                }
                media="(max-width: 768px)"
              />
            )}

            <source
              src={
                activeSlide.desktopSrc
              }
            />

            Your browser does
            not support HTML
            video.
          </video>
        )}

        {/* =================================================
            SOFT OVERLAY
        ================================================= */}

        <div
          className={
            styles.heroOverlay
          }
          aria-hidden="true"
        />

        {/* =================================================
            TEXT CONTENT
        ================================================= */}

        {(activeSlide.title ||
          activeSlide.description ||
          activeSlide.buttonText) && (
          <div
            className={
              styles.heroContent
            }
          >
            {activeSlide.title && (
              <h1
                key={`title-${activeSlide.id}`}
                className={
                  styles.heroTitle
                }
              >
                {activeSlide.title}
              </h1>
            )}

            {activeSlide.description && (
              <p
                key={`description-${activeSlide.id}`}
                className={
                  styles.heroDescription
                }
              >
                {
                  activeSlide.description
                }
              </p>
            )}

            {activeSlide.buttonText && (
              <Link
                to={getButtonHref(
                  activeSlide,
                )}
                className={
                  styles.shopButton
                }
              >
                <span>
                  {
                    activeSlide.buttonText
                  }
                </span>

                <ChevronRight
                  size={16}
                  strokeWidth={2}
                />
              </Link>
            )}
          </div>
        )}

        {/* =================================================
            PREVIOUS
        ================================================= */}

        {heroSlides.length >
          1 && (
          <button
            type="button"
            className={`${styles.heroArrow} ${styles.previousArrow}`}
            onClick={
              previousSlide
            }
            aria-label="Previous banner"
          >
            <ChevronLeft
              size={20}
              strokeWidth={1.8}
            />
          </button>
        )}

        {/* =================================================
            NEXT
        ================================================= */}

        {heroSlides.length >
          1 && (
          <button
            type="button"
            className={`${styles.heroArrow} ${styles.nextArrow}`}
            onClick={
              nextSlide
            }
            aria-label="Next banner"
          >
            <ChevronRight
              size={20}
              strokeWidth={1.8}
            />
          </button>
        )}

        {/* =================================================
            MUTE
        ================================================= */}

        {activeSlide.type ===
          "video" && (
          <button
            type="button"
            className={
              styles.muteButton
            }
            onClick={() => {
              setIsMuted(
                (
                  currentValue,
                ) =>
                  !currentValue,
              );
            }}
            aria-label={
              isMuted
                ? "Unmute promotional video"
                : "Mute promotional video"
            }
            aria-pressed={
              !isMuted
            }
          >
            {isMuted ? (
              <VolumeX
                size={17}
                strokeWidth={1.8}
              />
            ) : (
              <Volume2
                size={17}
                strokeWidth={1.8}
              />
            )}
          </button>
        )}

        {/* =================================================
            DOTS
        ================================================= */}

        {heroSlides.length >
          1 && (
          <div
            className={
              styles.dots
            }
            aria-label="Banner navigation"
          >
            {heroSlides.map(
              (
                slide,
                index,
              ) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`${styles.dot} ${
                    index ===
                    activeIndex
                      ? styles.activeDot
                      : ""
                  }`}
                  onClick={() => {
                    setActiveIndex(
                      index,
                    );
                  }}
                  aria-label={`Show banner ${
                    index + 1
                  }`}
                  aria-current={
                    index ===
                    activeIndex
                      ? "true"
                      : undefined
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;