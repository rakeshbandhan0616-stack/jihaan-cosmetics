export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  description?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl?: string;
  productLink?: string;
  buttonText?: string;
  displayOrder?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Offer {
  id: string;
  name: string;
  brand: string;
  category: string;
  rating: number;
  reviews: number;
  oldPrice: number;
  price: number;
  discount: string;
  prepaidPrice?: number;
  image: string;
  demoImage?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  brand?: string;
  category?: string;
  description?: string;
  image: string;
  images?: string[];
  hoverImage?: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  reviews?: number;
  shades?: string[];
  badge?: string;
  productType?: "new-arrival" | "bestseller" | "regular";
  isNewArrival?: boolean;
  isBestseller?: boolean;
  active?: boolean;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  image?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BeautyStory {
  id: string;
  title: string;
  description?: string;
  image?: string;
  content?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}