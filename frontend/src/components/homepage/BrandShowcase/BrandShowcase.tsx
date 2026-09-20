import { useEffect, useRef } from "react";
import { Eye, ArrowRight, Play } from "lucide-react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/pagination";

import styles from "./BrandShowcase.module.css";

import beautyTalk1 from "../../../assets/videos/beautytalk1.webm";
import beautyTalk2 from "../../../assets/videos/beautytalk2.webm";
import beautyTalk3 from "../../../assets/videos/beautytalk3.webm";
import beautyTalk4 from "../../../assets/videos/beautytalk4.webm";
import beautyTalk5 from "../../../assets/videos/beautytalk5.webm";
import beautyTalk6 from "../../../assets/videos/beautytalk6.webm";

const brands = [
  {
    name: "Glow Theory",
    description: "Clean skincare essentials",
    image:
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Lumière",
    description: "Luxury beauty rituals",
    image:
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Botanica",
    description: "Nature-inspired care",
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Pure Bloom",
    description: "Everyday beauty essentials",
    image:
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=85",
  },
];

const beautyStories = [
  {
    id: 1,
    title: "Everyday Glow Makeup Look",
    product: "Glow Essentials Makeup Kit",
    views: "3.1k",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk1,
  },
  {
    id: 2,
    title: "Get Ready With Me",
    product: "Hydrating Glow Serum",
    views: "3.7k",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk2,
  },
  {
    id: 3,
    title: "Glossy Lip Tint Tutorial",
    product: "Glossy Nude Lip Tint",
    views: "2.7k",
    image:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk3,
  },
  {
    id: 4,
    title: "Soft Glam Beauty Look",
    product: "Soft Glam Eyeshadow Palette",
    views: "3.4k",
    image:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk4,
  },
  {
    id: 5,
    title: "Perfect Blurred Lips",
    product: "Matte Finish Lipstick",
    views: "2.8k",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk5,
  },
  {
    id: 6,
    title: "Fresh Skin Beauty Routine",
    product: "Daily Skin Care Set",
    views: "4.2k",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=90",
    video: beautyTalk6,
  },
];

function BrandShowcase() {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const startAllVideos = () => {
      videoRefs.current.forEach((video) => {
        if (!video) return;

        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");

        const playPromise = video.play();

        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay can be blocked by browser policies.
          });
        }
      });
    };

    startAllVideos();

    const retryTimer = window.setTimeout(() => {
      startAllVideos();
    }, 1000);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, []);

  return (
    <section className={styles.section} id="brands">
      {/* Brands Section */}
      <div className={styles.sectionLayout}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>BEAUTY, CURATED FOR YOU</span>

          <h2>Explore Our Brands</h2>

          <p>
            Discover carefully selected beauty brands made for your everyday
            rituals.
          </p>

          <a href="#all-brands" className={styles.viewAll}>
            View All Brands
            <ArrowRight size={15} />
          </a>
        </div>

        <div className={styles.sliderArea}>
          <Swiper
            modules={[Autoplay, Pagination]}
            className={styles.brandSwiper}
            spaceBetween={16}
            slidesPerView={3}
            loop
            speed={900}
            autoplay={{
              delay: 2600,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{
              clickable: true,
            }}
            breakpoints={{
              0: {
                slidesPerView: 1.2,
                spaceBetween: 12,
              },
              520: {
                slidesPerView: 2,
                spaceBetween: 14,
              },
              900: {
                slidesPerView: 2.5,
                spaceBetween: 16,
              },
              1200: {
                slidesPerView: 3,
                spaceBetween: 16,
              },
            }}
          >
            {brands.map((brand) => (
              <SwiperSlide key={brand.name}>
                <a href="#brand-details" className={styles.brandCard}>
                  <img src={brand.image} alt={brand.name} />

                  <div className={styles.overlay}>
                    <span>{brand.description}</span>
                    <h3>{brand.name}</h3>
                    <p>Explore Collection →</p>
                  </div>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* The Talk of Beauty Section */}
      <div className={styles.beautyStories}>
        <div className={styles.storiesHeader}>
          <div>
            <span className={styles.eyebrow}>TRENDING BEAUTY MOMENTS</span>
            <h2>The Talk of Beauty</h2>
          </div>

          <a href="#beauty-stories" className={styles.viewAll}>
            View All
            <ArrowRight size={15} />
          </a>
        </div>

        <Swiper
          modules={[Autoplay]}
          className={styles.storiesSwiper}
          spaceBetween={24}
          slidesPerView={5}
          loop
          speed={850}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1.35,
              spaceBetween: 14,
            },
            480: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 18,
            },
            1100: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
            1400: {
              slidesPerView: 5,
              spaceBetween: 24,
            },
          }}
        >
          {beautyStories.map((story, index) => (
            <SwiperSlide key={story.id}>
              <article className={styles.storyCard}>
                <a
                  href={`/products/${story.id}`}
                  className={styles.storyImageLink}
                >
                  <div className={styles.storyImageWrapper}>
                    <img
                      src={story.image}
                      alt={story.title}
                      className={styles.storyImage}
                    />

                    <video
                      ref={(videoElement) => {
                        videoRefs.current[index] = videoElement;
                      }}
                      className={styles.storyVideo}
                      src={story.video}
                      autoPlay
                      muted
                      defaultMuted
                      loop
                      playsInline
                      preload="auto"
                      poster={story.image}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;

                        video.muted = true;
                        video.defaultMuted = true;

                        video.play().catch(() => {
                          // Autoplay may be blocked by the browser.
                        });
                      }}
                    />

                    <div className={styles.viewCount}>
                      <Eye size={14} />
                      <span>{story.views}</span>
                    </div>

                    <span className={styles.storyPlay}>
                      <Play size={15} fill="currentColor" />
                    </span>
                  </div>
                </a>

                <div className={styles.storyInfo}>
                  <h3>{story.title}</h3>
                  <p>{story.product}</p>
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export default BrandShowcase;