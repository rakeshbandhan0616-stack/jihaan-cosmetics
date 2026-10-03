import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { Html, Text } from "@react-three/drei";

import * as THREE from "three";

import {
  ArrowLeft,
  Camera,
  ChevronUp,
  Eye,
  Gamepad2,
  Info,
  Map,
  Maximize2,
  Mouse,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./VirtualMallPage.css";

/* =========================================================
   API CONFIG
========================================================= */

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const MALL_SLUG = "jini-cosmetics-virtual-mall";

/* =========================================================
   TYPES
========================================================= */

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type ProductImage =
  | string
  | {
      url?: string;
      src?: string;
      secure_url?: string;
    };

type Product = {
  _id?: string;
  id?: string;

  name: string;
  slug?: string;

  brand?: string;

  category?: string;
  subcategory?: string;

  description?: string;

  price?: number;
  oldPrice?: number;

  rating?: number;
  reviews?: number;

  images?: ProductImage[];

  hoverImage?: string;

  badge?: string;

  stock?: number;

  active?: boolean;

  isOutOfStock?: boolean;
};

type ProductLocation = {
  _id?: string;

  product?: Product | string;

  storeId: string;

  floorNumber?: number;

  position: Vec3;

  rotation?: Vec3;

  scale?: Vec3;

  displayType?: string;

  isInteractive?: boolean;

  showProductPopup?: boolean;

  allowAddToCart?: boolean;

  allowViewDetails?: boolean;

  isActive?: boolean;

  sortOrder?: number;
};

type MallStore = {
  storeId: string;

  name: string;

  slug?: string;

  description?: string;

  category?: string;

  subcategory?: string;

  position?: Vec3;

  rotation?: Vec3;

  scale?: Vec3;

  size?: {
    width?: number;
    height?: number;
    depth?: number;
  };

  floorNumber?: number;

  primaryColor?: string;

  secondaryColor?: string;

  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    interior?: string;
  };

  isActive?: boolean;

  isFeatured?: boolean;
};

type MallSettings = {
  playerHeight?: number;

  movementSpeed?: number;

  runningSpeed?: number;

  cameraFov?: number;

  cameraNear?: number;

  cameraFar?: number;

  productInteractionDistance?: number;

  mobileJoystickEnabled?: boolean;

  mobileSwipeEnabled?: boolean;

  forceLandscapeOnMobile?: boolean;

  maxPixelRatio?: number;
};

type MallData = {
  _id: string;

  name: string;

  slug: string;

  description?: string;

  logo?: string;

  coverImage?: string;

  thumbnailImage?: string;

  modelUrl?: string;

  modelType?: string;

  backgroundColor?: string;

  stores: MallStore[];

  productLocations: ProductLocation[];

  floors?: unknown[];

  spawnPoint?: {
    position?: Vec3;
    rotation?: Vec3;
  };

  settings?: MallSettings;

  isPublished?: boolean;

  isActive?: boolean;

  maintenanceMode?: boolean;

  maintenanceMessage?: string;
};

type ApiResponse<T> = {
  success?: boolean;

  mall?: T;

  product?: T;

  data?: T;

  message?: string;
};

/* =========================================================
   FALLBACK DEMO DATA
   Used ONLY when:
   VITE_VIRTUAL_MALL_DEMO_MODE=true
========================================================= */

const FALLBACK_STORES: MallStore[] = [
  {
    storeId: "makeup",
    name: "MAKEUP",
    category: "Makeup",
    description:
      "Lipsticks, foundations, eye makeup and beauty essentials.",
    position: {
      x: -15,
      y: 0,
      z: -9,
    },
    size: {
      width: 13,
      height: 4.8,
      depth: 11,
    },
    colors: {
      primary: "#e72d82",
      secondary: "#24151d",
      accent: "#ff8ab9",
      interior: "#35151f",
    },
    isActive: true,
  },

  {
    storeId: "skin-care",
    name: "SKIN CARE",
    category: "Skin Care",
    description:
      "Daily skincare, serums, cleansers and moisturizers.",
    position: {
      x: 15,
      y: 0,
      z: -9,
    },
    size: {
      width: 13,
      height: 4.8,
      depth: 11,
    },
    colors: {
      primary: "#2b9c86",
      secondary: "#102b29",
      accent: "#74d7bf",
      interior: "#173d38",
    },
    isActive: true,
  },

  {
    storeId: "hair-care",
    name: "HAIR CARE",
    category: "Hair Care",
    description:
      "Hair care products, masks, oils and styling essentials.",
    position: {
      x: -15,
      y: 0,
      z: 8,
    },
    size: {
      width: 13,
      height: 4.8,
      depth: 11,
    },
    colors: {
      primary: "#c58b48",
      secondary: "#251d16",
      accent: "#f0c58b",
      interior: "#3b2a1b",
    },
    isActive: true,
  },

  {
    storeId: "fragrance",
    name: "FRAGRANCE",
    category: "Fragrance",
    description:
      "Perfumes, mists and fragrance collections.",
    position: {
      x: 15,
      y: 0,
      z: 8,
    },
    size: {
      width: 13,
      height: 4.8,
      depth: 11,
    },
    colors: {
      primary: "#8366d6",
      secondary: "#211a31",
      accent: "#bba8ff",
      interior: "#2e2444",
    },
    isActive: true,
  },
];

const FALLBACK_PRODUCTS: ProductLocation[] = [
  {
    _id: "demo-1",

    storeId: "makeup",

    position: {
      x: -18,
      y: 1.35,
      z: -12,
    },

    product: {
      id: "demo-1",
      name: "Velvet Matte Lipstick",
      brand: "JINI Cosmetics",
      category: "Makeup",
      price: 699,
      rating: 4.6,
      reviews: 128,
      description:
        "Long-lasting matte lipstick for a smooth beauty finish.",
      images: [],
    },

    isInteractive: true,
    allowAddToCart: true,
    allowViewDetails: true,
  },

  {
    _id: "demo-2",

    storeId: "makeup",

    position: {
      x: -13,
      y: 1.35,
      z: -12,
    },

    product: {
      id: "demo-2",
      name: "Silk Glow Foundation",
      brand: "JINI Cosmetics",
      category: "Makeup",
      price: 899,
      rating: 4.5,
      reviews: 86,
      description:
        "Buildable coverage with a natural glow.",
      images: [],
    },

    isInteractive: true,
    allowAddToCart: true,
    allowViewDetails: true,
  },

  {
    _id: "demo-3",

    storeId: "skin-care",

    position: {
      x: 12,
      y: 1.35,
      z: -12,
    },

    product: {
      id: "demo-3",
      name: "Hydra Glow Serum",
      brand: "JINI Cosmetics",
      category: "Skin Care",
      price: 799,
      rating: 4.7,
      reviews: 94,
      description:
        "A lightweight daily serum for a fresh hydrated look.",
      images: [],
    },

    isInteractive: true,
    allowAddToCart: true,
    allowViewDetails: true,
  },

  {
    _id: "demo-4",

    storeId: "hair-care",

    position: {
      x: -18,
      y: 1.35,
      z: 11,
    },

    product: {
      id: "demo-4",
      name: "Repair Hair Mask",
      brand: "JINI Cosmetics",
      category: "Hair Care",
      price: 749,
      rating: 4.4,
      reviews: 61,
      description:
        "Nourishing care for dry and damaged hair.",
      images: [],
    },

    isInteractive: true,
    allowAddToCart: true,
    allowViewDetails: true,
  },

  {
    _id: "demo-5",

    storeId: "fragrance",

    position: {
      x: 12,
      y: 1.35,
      z: 11,
    },

    product: {
      id: "demo-5",
      name: "Bloom Eau de Parfum",
      brand: "JINI Cosmetics",
      category: "Fragrance",
      price: 1199,
      rating: 4.8,
      reviews: 143,
      description:
        "A modern floral fragrance for everyday elegance.",
      images: [],
    },

    isInteractive: true,
    allowAddToCart: true,
    allowViewDetails: true,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getToken(): string {
  return (
    localStorage.getItem("jihaan_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function getProductId(
  product?: Product | string,
): string {
  if (!product) {
    return "";
  }

  if (typeof product === "string") {
    return product;
  }

  return String(
    product._id ||
      product.id ||
      "",
  );
}

function getProductImage(
  product?: Product,
): string {
  const first = product?.images?.[0];

  if (typeof first === "string") {
    return first;
  }

  if (
    first &&
    typeof first === "object"
  ) {
    return String(
      first.url ||
        first.secure_url ||
        first.src ||
        "",
    );
  }

  return product?.hoverImage || "";
}

function formatPrice(
  value?: number,
): string {
  return `₹${Number(
    value || 0,
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function vec(
  value?: Vec3,
  fallback: Vec3 = {
    x: 0,
    y: 0,
    z: 0,
  },
): [number, number, number] {
  return [
    value?.x ?? fallback.x,
    value?.y ?? fallback.y,
    value?.z ?? fallback.z,
  ];
}

/* =========================================================
   KEYBOARD
========================================================= */

function useKeyboard() {
  const keys =
    useRef<Record<string, boolean>>(
      {},
    );

  useEffect(() => {
    const down = (
      event: KeyboardEvent,
    ) => {
      keys.current[
        event.key.toLowerCase()
      ] = true;

      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
        ].includes(
          event.key.toLowerCase(),
        )
      ) {
        event.preventDefault();
      }
    };

    const up = (
      event: KeyboardEvent,
    ) => {
      keys.current[
        event.key.toLowerCase()
      ] = false;
    };

    window.addEventListener(
      "keydown",
      down,
      {
        passive: false,
      },
    );

    window.addEventListener(
      "keyup",
      up,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        down,
      );

      window.removeEventListener(
        "keyup",
        up,
      );
    };
  }, []);

  return keys;
}

/* =========================================================
   COLLISION
========================================================= */

function isBlockedByStore(
  x: number,
  z: number,
  stores: MallStore[],
): boolean {
  const radius = 0.38;

  return stores.some(
    (store) => {
      if (
        store.isActive === false
      ) {
        return false;
      }

      const p =
        store.position || {
          x: 0,
          y: 0,
          z: 0,
        };

      const width =
        store.size?.width || 10;

      const depth =
        store.size?.depth || 10;

      const halfW =
        width / 2;

      const halfD =
        depth / 2;

      const leftWall =
        Math.abs(
          x -
            (p.x - halfW),
        ) < radius &&
        z >
          p.z -
            halfD -
            radius &&
        z <
          p.z +
            halfD +
            radius;

      const rightWall =
        Math.abs(
          x -
            (p.x + halfW),
        ) < radius &&
        z >
          p.z -
            halfD -
            radius &&
        z <
          p.z +
            halfD +
            radius;

      const backWall =
        Math.abs(
          z -
            (p.z - halfD),
        ) < radius &&
        x >
          p.x -
            halfW -
            radius &&
        x <
          p.x +
            halfW +
            radius;

      return (
        leftWall ||
        rightWall ||
        backWall
      );
    },
  );
}

/* =========================================================
   PLAYER
========================================================= */

type PlayerControllerProps = {
  mall: MallData;

  joystick: {
    x: number;
    y: number;
  };

  look: {
    x: number;
    y: number;
  };

  onNearbyProduct: (
    product: ProductLocation | null,
  ) => void;

  onPosition: (
    position: {
      x: number;
      z: number;
    },
  ) => void;
};

function PlayerController({
  mall,
  joystick,
  look,
  onNearbyProduct,
  onPosition,
}: PlayerControllerProps) {
  const { camera } =
    useThree();

  const keys =
    useKeyboard();

  const yaw =
    useRef(0);

  const pitch =
    useRef(-0.02);

  const forward =
    useRef(
      new THREE.Vector3(),
    );

  const right =
    useRef(
      new THREE.Vector3(),
    );

  const move =
    useRef(
      new THREE.Vector3(),
    );

  const lastNearby =
    useRef<string | null>(
      null,
    );

  const height =
    mall.settings
      ?.playerHeight ||
    1.72;

  const speed =
    mall.settings
      ?.movementSpeed ||
    4.6;

  const runSpeed =
    mall.settings
      ?.runningSpeed ||
    7.5;

  const interactionDistance =
    mall.settings
      ?.productInteractionDistance ||
    3.2;

  useEffect(() => {
    const spawn =
      mall.spawnPoint
        ?.position || {
        x: 0,
        y: height,
        z: 22,
      };

    camera.position.set(
      spawn.x,
      height,
      spawn.z,
    );

    yaw.current =
      mall.spawnPoint
        ?.rotation?.y ??
      Math.PI;

    pitch.current =
      -0.03;
  }, [
    camera,
    height,
    mall,
  ]);

  useFrame(
    (_, delta) => {
      const dt =
        Math.min(
          delta,
          0.05,
        );

      /* Camera look */

      yaw.current -=
        look.x * 0.0028;

      pitch.current =
        THREE.MathUtils.clamp(
          pitch.current -
            look.y * 0.0022,
          -1.05,
          1.05,
        );

      camera.rotation.order =
        "YXZ";

      camera.rotation.y =
        yaw.current;

      camera.rotation.x =
        pitch.current;

      /* Keyboard */

      const k =
        keys.current;

      const keyboardX =
        Number(
          Boolean(
            k.d ||
              k.arrowright,
          ),
        ) -
        Number(
          Boolean(
            k.a ||
              k.arrowleft,
          ),
        );

      const keyboardY =
        Number(
          Boolean(
            k.s ||
              k.arrowdown,
          ),
        ) -
        Number(
          Boolean(
            k.w ||
              k.arrowup,
          ),
        );

      const inputX =
        THREE.MathUtils.clamp(
          keyboardX +
            joystick.x,
          -1,
          1,
        );

      const inputY =
        THREE.MathUtils.clamp(
          keyboardY +
            joystick.y,
          -1,
          1,
        );

      const inputLength =
        Math.hypot(
          inputX,
          inputY,
        );

      const ix =
        inputLength > 1
          ? inputX /
            inputLength
          : inputX;

      const iy =
        inputLength > 1
          ? inputY /
            inputLength
          : inputY;

      /* Direction */

      camera.getWorldDirection(
        forward.current,
      );

      forward.current.y =
        0;

      forward.current.normalize();

      right.current
        .crossVectors(
          forward.current,
          camera.up,
        )
        .normalize();

      move.current.set(
        0,
        0,
        0,
      );

      move.current.addScaledVector(
        forward.current,
        -iy,
      );

      move.current.addScaledVector(
        right.current,
        ix,
      );

      if (
        move.current.lengthSq() >
        0
      ) {
        move.current.normalize();

        const currentSpeed =
          k.shift
            ? runSpeed
            : speed;

        const nextX =
          camera.position.x +
          move.current.x *
            currentSpeed *
            dt;

        const nextZ =
          camera.position.z +
          move.current.z *
            currentSpeed *
            dt;

        const x =
          THREE.MathUtils.clamp(
            nextX,
            -26.5,
            26.5,
          );

        const z =
          THREE.MathUtils.clamp(
            nextZ,
            -25.5,
            25.5,
          );

        if (
          !isBlockedByStore(
            x,
            z,
            mall.stores,
          )
        ) {
          camera.position.x =
            x;

          camera.position.z =
            z;
        }
      }

      camera.position.y =
        height;

      /* Nearby product */

      let closest:
        | ProductLocation
        | null = null;

      let closestDistance =
        interactionDistance;

      for (
        const location of
          mall.productLocations ||
        []
      ) {
        if (
          location.isActive ===
            false ||
          location.isInteractive ===
            false
        ) {
          continue;
        }

        const dx =
          location.position.x -
          camera.position.x;

        const dz =
          location.position.z -
          camera.position.z;

        const distance =
          Math.hypot(
            dx,
            dz,
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closest =
            location;
        }
      }

      const currentId =
        closest?._id || null;

      if (
        currentId !==
        lastNearby.current
      ) {
        lastNearby.current =
          currentId;

        onNearbyProduct(
          closest,
        );
      }

      onPosition({
        x:
          camera.position.x,
        z:
          camera.position.z,
      });
    },
  );

  return null;
}

/* =========================================================
   FLOOR
========================================================= */

function MallFloor() {
  return (
    <group>
      <mesh
        position={[
          0,
          -0.06,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            58,
            0.12,
            58,
          ]}
        />

        <meshStandardMaterial
          color="#eee7e3"
          roughness={0.62}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.005,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            52,
            0.025,
            52,
          ]}
        />

        <meshStandardMaterial
          color="#d8ccc7"
          roughness={0.42}
          metalness={0.05}
        />
      </mesh>

      <gridHelper
        args={[
          52,
          26,
          "#bba9a4",
          "#e6ddd8",
        ]}
        position={[
          0,
          0.025,
          0,
        ]}
      />
    </group>
  );
}

/* =========================================================
   ARCHITECTURE
========================================================= */

function MallArchitecture() {
  return (
    <group>
      <mesh
        position={[
          0,
          6.1,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            58,
            0.3,
            58,
          ]}
        />

        <meshStandardMaterial
          color="#24191c"
          roughness={0.4}
        />
      </mesh>

      {[
        [
          -28.5,
          3,
          0,
          0.6,
          6,
          58,
        ],

        [
          28.5,
          3,
          0,
          0.6,
          6,
          58,
        ],

        [
          0,
          3,
          -28.5,
          58,
          6,
          0.6,
        ],

        [
          0,
          3,
          28.5,
          58,
          6,
          0.6,
        ],
      ].map(
        (
          a,
          index,
        ) => (
          <mesh
            key={index}
            position={[
              a[0],
              a[1],
              a[2],
            ]}
            receiveShadow
          >
            <boxGeometry
              args={[
                a[3],
                a[4],
                a[5],
              ]}
            />

            <meshStandardMaterial
              color="#fffaf8"
              roughness={0.68}
            />
          </mesh>
        ),
      )}

      <mesh
        position={[
          0,
          2.8,
          -22.5,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            18,
            5.4,
            0.8,
          ]}
        />

        <meshStandardMaterial
          color="#171114"
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>

      <Text
        position={[
          0,
          3.2,
          -23,
        ]}
        fontSize={1.25}
        color="#fff8f3"
        anchorX="center"
      >
        JINI
      </Text>

      <Text
        position={[
          0,
          2.55,
          -23,
        ]}
        fontSize={0.34}
        color="#f6a9c9"
        anchorX="center"
      >
        COSMETICS • VIRTUAL MALL
      </Text>

      <CentralFeature />

      <EscalatorLike
        position={[
          0,
          0,
          0,
        ]}
      />
    </group>
  );
}

/* =========================================================
   CENTRAL FEATURE
========================================================= */

function CentralFeature() {
  return (
    <group
      position={[
        0,
        0,
        -1,
      ]}
    >
      <mesh
        position={[
          0,
          0.22,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[
            3.4,
            3.4,
            0.45,
            64,
          ]}
        />

        <meshStandardMaterial
          color="#e8d3cc"
          roughness={0.38}
          metalness={0.12}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.05,
          0,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            2.3,
            1.8,
            1.6,
            48,
          ]}
        />

        <meshStandardMaterial
          color="#d92d78"
          roughness={0.34}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.95,
          0,
        ]}
        castShadow
      >
        <sphereGeometry
          args={[
            0.65,
            32,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#fff0f5"
          emissive="#f18ab6"
          emissiveIntensity={0.45}
        />
      </mesh>

      {Array.from({
        length: 12,
      }).map(
        (_, index) => {
          const angle =
            (index / 12) *
            Math.PI *
            2;

          return (
            <mesh
              key={index}
              position={[
                Math.cos(
                  angle,
                ) * 2.8,

                0.5,

                Math.sin(
                  angle,
                ) * 2.8,
              ]}
            >
              <sphereGeometry
                args={[
                  0.08,
                  16,
                  12,
                ]}
              />

              <meshStandardMaterial
                color="#ff5e9f"
                emissive="#ff5e9f"
                emissiveIntensity={2}
              />
            </mesh>
          );
        },
      )}
    </group>
  );
}

/* =========================================================
   ESCALATOR
========================================================= */

function EscalatorLike({
  position,
}: {
  position: [
    number,
    number,
    number,
  ];
}) {
  return (
    <group
      position={
        position
      }
    >
      <mesh
        position={[
          -4.7,
          0.45,
          0,
        ]}
        rotation={[
          0,
          0,
          0.08,
        ]}
      >
        <boxGeometry
          args={[
            5.4,
            0.18,
            3.2,
          ]}
        />

        <meshStandardMaterial
          color="#242024"
          metalness={0.45}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          4.7,
          0.45,
          0,
        ]}
        rotation={[
          0,
          0,
          -0.08,
        ]}
      >
        <boxGeometry
          args={[
            5.4,
            0.18,
            3.2,
          ]}
        />

        <meshStandardMaterial
          color="#242024"
          metalness={0.45}
          roughness={0.3}
        />
      </mesh>

      <Text
        position={[
          0,
          2.1,
          0,
        ]}
        fontSize={0.45}
        color="#ffffff"
        anchorX="center"
      >
        MORE BEAUTY AHEAD
      </Text>
    </group>
  );
}

/* =========================================================
   CEILING LIGHTS
========================================================= */

function CeilingLights() {
  const positions =
    useMemo(() => {
      const list: [
        number,
        number,
        number,
      ][] = [];

      for (
        let x = -20;
        x <= 20;
        x += 10
      ) {
        for (
          let z = -20;
          z <= 20;
          z += 10
        ) {
          list.push([
            x,
            5.3,
            z,
          ]);
        }
      }

      return list;
    }, []);

  return (
    <group>
      {positions.map(
        (
          position,
          index,
        ) => (
          <group
            key={index}
            position={
              position
            }
          >
            <mesh>
              <boxGeometry
                args={[
                  3.2,
                  0.06,
                  0.35,
                ]}
              />

              <meshStandardMaterial
                color="#fff5ef"
                emissive="#ffd9e8"
                emissiveIntensity={
                  1.5
                }
              />
            </mesh>

            <pointLight
              color="#ffd7e6"
              intensity={9}
              distance={11}
              decay={2}
            />
          </group>
        ),
      )}
    </group>
  );
}

/* =========================================================
   STORE
========================================================= */

function Store({
  store,
  onSelect,
}: {
  store: MallStore;

  onSelect: (
    store: MallStore,
  ) => void;
}) {
  const position =
    vec(store.position);

  const width =
    store.size?.width ||
    11;

  const height =
    store.size?.height ||
    4.6;

  const depth =
    store.size?.depth ||
    10;

  const primary =
    store.primaryColor ||
    store.colors?.primary ||
    "#e72d82";

  const secondary =
    store.secondaryColor ||
    store.colors?.secondary ||
    "#251a1d";

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();

        onSelect(store);
      }}
    >
      {/* Back wall */}

      <mesh
        position={[
          0,
          height / 2,
          -depth / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width,
            height,
            0.35,
          ]}
        />

        <meshStandardMaterial
          color={secondary}
          roughness={0.52}
        />
      </mesh>

      {/* Left wall */}

      <mesh
        position={[
          -width / 2,
          height / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            0.35,
            height,
            depth,
          ]}
        />

        <meshStandardMaterial
          color={secondary}
          roughness={0.52}
        />
      </mesh>

      {/* Right wall */}

      <mesh
        position={[
          width / 2,
          height / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            0.35,
            height,
            depth,
          ]}
        />

        <meshStandardMaterial
          color={secondary}
          roughness={0.52}
        />
      </mesh>

      {/* Header */}

      <mesh
        position={[
          0,
          height * 0.83,
          depth / 2 + 0.05,
        ]}
      >
        <boxGeometry
          args={[
            width * 0.96,
            0.8,
            0.12,
          ]}
        />

        <meshStandardMaterial
          color={primary}
          emissive={primary}
          emissiveIntensity={0.18}
        />
      </mesh>

      <Text
        position={[
          0,
          height * 0.85,
          depth / 2 + 0.13,
        ]}
        fontSize={0.64}
        color="#fff"
        anchorX="center"
      >
        {store.name}
      </Text>

      {/* Glass displays */}

      {[
        -width / 2 + 2.4,
        width / 2 - 2.4,
      ].map((x) => (
        <mesh
          key={x}
          position={[
            x,
            1.7,
            depth / 2 + 0.12,
          ]}
        >
          <boxGeometry
            args={[
              2.5,
              3.3,
              0.12,
            ]}
          />

          <meshStandardMaterial
            color="#130f12"
            transparent
            opacity={0.48}
            metalness={0.15}
            roughness={0.2}
          />
        </mesh>
      ))}

      <Text
        position={[
          0,
          0.92,
          depth / 2 + 0.24,
        ]}
        fontSize={0.22}
        color="#fff"
        anchorX="center"
      >
        CLICK TO EXPLORE
      </Text>

      <StoreShelves
        width={width}
        depth={depth}
        color={primary}
      />
    </group>
  );
}

/* =========================================================
   STORE SHELVES
========================================================= */

function StoreShelves({
  width,
  depth,
  color,
}: {
  width: number;

  depth: number;

  color: string;
}) {
  const shelfXs = [
    -width / 2 + 1.2,
    0,
    width / 2 - 1.2,
  ];

  return (
    <group>
      {shelfXs.map(
        (x) => (
          <group
            key={x}
            position={[
              x,
              1.25,
              -depth / 2 +
                1.7,
            ]}
          >
            <mesh castShadow>
              <boxGeometry
                args={[
                  1.55,
                  2.4,
                  0.75,
                ]}
              />

              <meshStandardMaterial
                color="#a98278"
                roughness={0.55}
              />
            </mesh>

            {[
              0.6,
              1.15,
              1.7,
            ].map(
              (y) => (
                <mesh
                  key={y}
                  position={[
                    0,
                    y,
                    0.45,
                  ]}
                >
                  <boxGeometry
                    args={[
                      1.8,
                      0.06,
                      0.95,
                    ]}
                  />

                  <meshStandardMaterial
                    color={color}
                  />
                </mesh>
              ),
            )}
          </group>
        ),
      )}
    </group>
  );
}

/* =========================================================
   PRODUCT DISPLAY
========================================================= */

function ProductDisplay({
  location,
  onSelect,
}: {
  location: ProductLocation;

  onSelect: (
    location: ProductLocation,
  ) => void;
}) {
  const [
    hovered,
    setHovered,
  ] = useState(false);

  const product =
    typeof location.product ===
    "object"
      ? location.product
      : undefined;

  if (
    location.isActive ===
    false
  ) {
    return null;
  }

  const color =
    location.storeId ===
    "skin-care"
      ? "#e8b892"
      : location.storeId ===
          "fragrance"
        ? "#b49af2"
        : location.storeId ===
            "hair-care"
          ? "#d1a26c"
          : "#e85b8e";

  return (
    <group
      position={vec(
        location.position,
      )}
      rotation={vec(
        location.rotation,
      )}
      scale={vec(
        location.scale,
        {
          x: 1,
          y: 1,
          z: 1,
        },
      )}
      onPointerOver={(
        event,
      ) => {
        event.stopPropagation();

        setHovered(true);
      }}
      onPointerOut={() =>
        setHovered(false)
      }
      onClick={(event) => {
        event.stopPropagation();

        onSelect(location);
      }}
    >
      <mesh
        position={[
          0,
          -0.7,
          0,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.72,
            0.82,
            0.32,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#d8c0b8"
          roughness={0.36}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.15,
          0,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.3,
            0.34,
            1.35,
            24,
          ]}
        />

        <meshStandardMaterial
          color={color}
          roughness={0.32}
          metalness={0.08}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.88,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.31,
            0.31,
            0.12,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#252025"
          metalness={0.35}
          roughness={0.24}
        />
      </mesh>

      {product?.name && (
        <Text
          position={[
            0,
            1.42,
            0,
          ]}
          fontSize={0.2}
          maxWidth={2.2}
          color="#fff"
          anchorX="center"
        >
          {product.name}
        </Text>
      )}

      {hovered && (
        <Html
          center
          position={[
            0,
            2.05,
            0,
          ]}
        >
          <div className="mall-product-world-card">
            {getProductImage(
              product,
            ) ? (
              <img
                src={getProductImage(
                  product,
                )}
                alt={
                  product?.name ||
                  "Product"
                }
              />
            ) : (
              <div className="mall-product-world-placeholder">
                <Sparkles
                  size={18}
                />
              </div>
            )}

            <div>
              <strong>
                {product?.name ||
                  "Beauty Product"}
              </strong>

              <span>
                {formatPrice(
                  product?.price,
                )}
              </span>

              <small>
                Click to view
              </small>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* =========================================================
   MALL SCENE
========================================================= */

function MallScene({
  mall,
  joystick,
  look,
  onProductSelect,
  onStoreSelect,
  onNearbyProduct,
  onPosition,
}: {
  mall: MallData;

  joystick: {
    x: number;
    y: number;
  };

  look: {
    x: number;
    y: number;
  };

  onProductSelect: (
    location: ProductLocation,
  ) => void;

  onStoreSelect: (
    store: MallStore,
  ) => void;

  onNearbyProduct: (
    location: ProductLocation | null,
  ) => void;

  onPosition: (
    position: {
      x: number;
      z: number;
    },
  ) => void;
}) {
  return (
    <>
      <color
        attach="background"
        args={[
          mall.backgroundColor ||
            "#171116",
        ]}
      />

      <fog
        attach="fog"
        args={[
          mall.backgroundColor ||
            "#171116",
          30,
          62,
        ]}
      />

      <ambientLight
        intensity={1.5}
        color="#fff0f5"
      />

      <directionalLight
        position={[
          8,
          18,
          12,
        ]}
        intensity={2.5}
        color="#fff3e9"
        castShadow
        shadow-mapSize-width={
          2048
        }
        shadow-mapSize-height={
          2048
        }
      />

      <CeilingLights />

      <MallFloor />

      <MallArchitecture />

      {mall.stores
        .filter(
          (store) =>
            store.isActive !==
            false,
        )
        .map((store) => (
          <Store
            key={
              store.storeId
            }
            store={store}
            onSelect={
              onStoreSelect
            }
          />
        ))}

      {mall.productLocations
        .filter(
          (location) =>
            location.isActive !==
            false,
        )
        .map(
          (location) => (
            <ProductDisplay
              key={
                location._id ||
                `${location.storeId}-${location.position.x}-${location.position.z}`
              }
              location={
                location
              }
              onSelect={
                onProductSelect
              }
            />
          ),
        )}

      <PlayerController
        mall={mall}
        joystick={joystick}
        look={look}
        onNearbyProduct={
          onNearbyProduct
        }
        onPosition={
          onPosition
        }
      />
    </>
  );
}

/* =========================================================
   PRODUCT MODAL
========================================================= */

function ProductModal({
  location,
  onClose,
}: {
  location: ProductLocation;

  onClose: () => void;
}) {
  const navigate =
    useNavigate();

  const product =
    typeof location.product ===
    "object"
      ? location.product
      : undefined;

  const [
    adding,
    setAdding,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const id =
    getProductId(product);

  const image =
    getProductImage(
      product,
    );

  const addToCart =
    async () => {
      if (
        !id ||
        id.startsWith(
          "demo-",
        )
      ) {
        setMessage(
          "This is a demo product. Connect it to a real product ID before adding it to cart.",
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        navigate(
          "/login",
          {
            state: {
              redirectTo:
                "/virtual-mall",
            },
          },
        );

        return;
      }

      if (
        location.allowAddToCart ===
        false
      ) {
        setMessage(
          "Add to cart is disabled for this product.",
        );

        return;
      }

      if (
        Number(
          product?.stock || 0,
        ) <= 0 ||
        product?.isOutOfStock
      ) {
        setMessage(
          "This product is currently out of stock.",
        );

        return;
      }

      try {
        setAdding(true);

        setMessage("");

        /* Check Virtual Mall availability */

        const availabilityResponse =
          await fetch(
            `${API_BASE_URL}/virtual-mall/products/${encodeURIComponent(
              id,
            )}/availability`,
            {
              headers: {
                Accept:
                  "application/json",
              },
            },
          );

        const availabilityData =
          await availabilityResponse
            .json()
            .catch(
              () => ({}),
            );

        if (
          !availabilityResponse.ok ||
          availabilityData?.data
            ?.available !==
            true
        ) {
          throw new Error(
            availabilityData?.message ||
              "This product is currently unavailable.",
          );
        }

        /* Add to actual cart */

        const response =
          await fetch(
            `${API_BASE_URL}/cart/items`,
            {
              method:
                "POST",

              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization: `Bearer ${token}`,
              },

              body: JSON.stringify(
                {
                  productId:
                    id,

                  quantity: 1,

                  size: "Standard",
                },
              ),
            },
          );

        const data =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              "Unable to add product to cart.",
          );
        }

        window.dispatchEvent(
          new Event(
            "cartUpdated",
          ),
        );

        setMessage(
          "Added to your cart successfully.",
        );
      } catch (error) {
        setMessage(
          error instanceof
            Error
            ? error.message
            : "Unable to add product to cart.",
        );
      } finally {
        setAdding(false);
      }
    };

  return (
    <div
      className="mall-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="mall-product-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="mall-modal-close"
          type="button"
          onClick={
            onClose
          }
          aria-label="Close product"
        >
          <X size={20} />
        </button>

        <div className="mall-product-image">
          {image ? (
            <img
              src={image}
              alt={
                product?.name ||
                "Product"
              }
            />
          ) : (
            <div className="mall-product-placeholder">
              <Sparkles
                size={48}
              />

              <span>
                JINI BEAUTY
              </span>
            </div>
          )}
        </div>

        <div className="mall-product-info">
          <span className="mall-product-category">
            {product?.category ||
              "JINI Cosmetics"}
          </span>

          <h2>
            {product?.name ||
              "Beauty Product"}
          </h2>

          <p className="mall-product-brand">
            {product?.brand ||
              "JINI Cosmetics"}
          </p>

          <p className="mall-product-description">
            {product?.description ||
              "Discover this product inside the JINI Cosmetics Virtual Mall."}
          </p>

          <div className="mall-price-row">
            <strong>
              {formatPrice(
                product?.price,
              )}
            </strong>

            {!!product?.oldPrice &&
              Number(
                product.oldPrice,
              ) >
                Number(
                  product.price ||
                    0,
                ) && (
                <del>
                  {formatPrice(
                    product.oldPrice,
                  )}
                </del>
              )}
          </div>

          {product?.rating !==
            undefined && (
            <div className="mall-rating">
              ★{" "}
              {Number(
                product.rating,
              ).toFixed(1)}

              {product.reviews
                ? ` (${product.reviews} reviews)`
                : ""}
            </div>
          )}

          {message && (
            <div
              className={
                message.includes(
                  "successfully",
                )
                  ? "mall-success"
                  : "mall-error"
              }
            >
              {message}
            </div>
          )}

          <div className="mall-product-actions">
            <button
              type="button"
              className="mall-add-cart"
              disabled={
                adding ||
                location.allowAddToCart ===
                  false
              }
              onClick={
                addToCart
              }
            >
              <ShoppingCart
                size={18}
              />

              {adding
                ? "Adding..."
                : "Add to Cart"}
            </button>

            <button
              type="button"
              className="mall-view-product"
              disabled={
                !id ||
                location.allowViewDetails ===
                  false
              }
              onClick={() => {
                if (!id) {
                  return;
                }

                navigate(
                  `/products/${encodeURIComponent(
                    id,
                  )}`,
                );
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MOBILE JOYSTICK
========================================================= */

function Joystick({
  onMove,
}: {
  onMove: (
    x: number,
    y: number,
  ) => void;
}) {
  const active =
    useRef(false);

  const [
    value,
    setValue,
  ] = useState({
    x: 0,
    y: 0,
  });

  const update = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      !active.current
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const dx =
      event.clientX -
      (rect.left +
        rect.width / 2);

    const dy =
      event.clientY -
      (rect.top +
        rect.height / 2);

    const max =
      rect.width / 2;

    const distance =
      Math.hypot(
        dx,
        dy,
      );

    const factor =
      distance > max
        ? max / distance
        : 1;

    const x =
      (dx * factor) /
      max;

    const y =
      (dy * factor) /
      max;

    setValue({
      x,
      y,
    });

    onMove(x, y);
  };

  const reset = () => {
    active.current =
      false;

    setValue({
      x: 0,
      y: 0,
    });

    onMove(0, 0);
  };

  return (
    <div
      className="mall-joystick"
      onPointerDown={(
        event,
      ) => {
        active.current =
          true;

        event.currentTarget.setPointerCapture(
          event.pointerId,
        );

        update(event);
      }}
      onPointerMove={
        update
      }
      onPointerUp={
        reset
      }
      onPointerCancel={
        reset
      }
      onPointerLeave={() => {
        if (
          active.current
        ) {
          reset();
        }
      }}
    >
      <div
        className="mall-joystick-knob"
        style={{
          transform: `translate(${value.x * 28}px, ${value.y * 28}px)`,
        }}
      />
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function VirtualMallPage() {
  const navigate =
    useNavigate();

  const [
    mall,
    setMall,
  ] = useState<
    MallData | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const demoMode =
    String(
      import.meta.env
        .VITE_VIRTUAL_MALL_DEMO_MODE ||
        "false",
    ) === "true";

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<ProductLocation | null>(
      null,
    );

  const [
    selectedStore,
    setSelectedStore,
  ] =
    useState<MallStore | null>(
      null,
    );

  const [
    nearbyProduct,
    setNearbyProduct,
  ] =
    useState<ProductLocation | null>(
      null,
    );

  const [
    showMap,
    setShowMap,
  ] = useState(false);

  const [
    showControls,
    setShowControls,
  ] = useState(true);

  const [
    isMobile,
    setIsMobile,
  ] = useState(false);

  const [
    joystick,
    setJoystick,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    look,
    setLook,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    z: 22,
  });

  /* =====================================================
     LOAD MALL
  ===================================================== */

  const loadMall =
    useCallback(
      async () => {
        setLoading(true);

        setError("");

        try {
          /*
            IMPORTANT:

            This matches the backend route:

            router.get("/:slug", getVirtualMallBySlug);

            mounted as:

            app.use(
              "/api/virtual-mall",
              virtualMallRoutes
            );
          */

          const response =
            await fetch(
              `${API_BASE_URL}/virtual-mall/${encodeURIComponent(
                MALL_SLUG,
              )}`,
              {
                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const data =
            (await response
              .json()
              .catch(
                () => ({}),
              )) as ApiResponse<MallData>;

          if (
            !response.ok
          ) {
            throw new Error(
              data.message ||
                `Virtual Mall request failed (${response.status}).`,
            );
          }

          const mallData =
            data.mall ||
            data.data;

          if (
            !mallData
          ) {
            throw new Error(
              "Virtual Mall data was not returned by the server.",
            );
          }

          if (
            mallData.maintenanceMode
          ) {
            throw new Error(
              mallData.maintenanceMessage ||
                "Virtual Mall is currently under maintenance.",
            );
          }

          /*
            Use REAL MongoDB data.

            We do NOT replace real products
            with demo products here.
          */

          setMall({
            ...mallData,

            stores:
              mallData.stores ||
              [],

            productLocations:
              mallData.productLocations ||
              [],
          });
        } catch (
          loadError
        ) {
          console.error(
            "Virtual Mall API load failed:",
            loadError,
          );

          /*
            Demo mode is explicitly opt-in.
          */

          if (
            demoMode
          ) {
            setMall({
              _id:
                "local-demo",

              name:
                "JINI Cosmetics Virtual Mall",

              slug:
                MALL_SLUG,

              stores:
                FALLBACK_STORES,

              productLocations:
                FALLBACK_PRODUCTS,

              spawnPoint: {
                position: {
                  x: 0,
                  y: 1.72,
                  z: 22,
                },

                rotation: {
                  x: 0,
                  y: Math.PI,
                  z: 0,
                },
              },

              settings: {
                playerHeight:
                  1.72,

                movementSpeed:
                  4.6,

                runningSpeed:
                  7.5,

                cameraFov:
                  68,

                productInteractionDistance:
                  3.2,
              },
            });
          } else {
            setMall(null);

            setError(
              loadError instanceof
                Error
                ? loadError.message
                : "Unable to load the published Virtual Mall.",
            );
          }
        } finally {
          setLoading(
            false,
          );
        }
      },
      [demoMode],
    );

  useEffect(() => {
    loadMall();
  }, [loadMall]);

  /* =====================================================
     DEVICE
  ===================================================== */

  useEffect(() => {
    const updateDevice =
      () => {
        setIsMobile(
          window.innerWidth <=
            900 ||
            "ontouchstart" in
              window,
        );
      };

    updateDevice();

    window.addEventListener(
      "resize",
      updateDevice,
    );

    return () =>
      window.removeEventListener(
        "resize",
        updateDevice,
      );
  }, []);

  /* =====================================================
     LOOK CONTROLS
  ===================================================== */

  const lookActive =
    useRef(false);

  const lastPointer =
    useRef({
      x: 0,
      y: 0,
    });

  const handlePointerDown =
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        event.pointerType ===
          "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      lookActive.current =
        true;

      lastPointer.current =
        {
          x: event.clientX,
          y: event.clientY,
        };

      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    };

  const handlePointerMove =
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        !lookActive.current
      ) {
        return;
      }

      const dx =
        event.clientX -
        lastPointer.current
          .x;

      const dy =
        event.clientY -
        lastPointer.current
          .y;

      lastPointer.current =
        {
          x: event.clientX,
          y: event.clientY,
        };

      setLook({
        x: dx,
        y: dy,
      });

      requestAnimationFrame(
        () => {
          setLook({
            x: 0,
            y: 0,
          });
        },
      );
    };

  const stopLook = () => {
    lookActive.current =
      false;

    setLook({
      x: 0,
      y: 0,
    });
  };

  /* =====================================================
     MAP STORES
  ===================================================== */

  const mapStores =
    useMemo(
      () =>
        mall?.stores?.filter(
          (store) =>
            store.isActive !==
            false,
        ) || [],
      [mall],
    );

  /* =====================================================
     SELECTED STORE PRODUCTS
  ===================================================== */

  const selectedStoreProducts =
    useMemo(() => {
      if (
        !selectedStore ||
        !mall
      ) {
        return [];
      }

      return [
        ...mall.productLocations,
      ]
        .filter(
          (location) =>
            location.storeId?.toLowerCase() ===
              selectedStore.storeId?.toLowerCase() &&
            location.isActive !==
              false &&
            typeof location.product ===
              "object" &&
            location.product
              ?.active !==
              false,
        )
        .sort(
          (a, b) =>
            Number(
              a.sortOrder ||
                0,
            ) -
            Number(
              b.sortOrder ||
                0,
            ),
        );
    }, [
      mall,
      selectedStore,
    ]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="virtual-mall-page mall-loading">
        <div className="mall-loading-card">
          <div className="mall-loading-logo">
            JINI
          </div>

          <div className="mall-loading-spinner" />

          <Sparkles
            size={24}
          />

          <h2>
            Entering Virtual Mall
          </h2>

          <p>
            Preparing your
            immersive beauty
            experience...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (!mall) {
    return (
      <div className="virtual-mall-page mall-error-page">
        <div className="mall-error-card">
          <Info size={42} />

          <h1>
            Virtual Mall
          </h1>

          <p>
            {error ||
              "Unable to load the Virtual Mall."}
          </p>

          <button
            type="button"
            onClick={
              loadMall
            }
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            Back to JINI
            Cosmetics
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <div className="virtual-mall-page">
      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="mall-topbar">
        <div className="mall-brand">
          <button
            type="button"
            className="mall-back-button"
            onClick={() =>
              navigate("/")
            }
            aria-label="Back"
          >
            <ArrowLeft
              size={19}
            />
          </button>

          <div className="mall-brand-mark">
            <strong>
              JINI
            </strong>

            <span>
              COSMETICS
            </span>
          </div>

          <div className="mall-brand-copy">
            <strong>
              Virtual Mall
            </strong>

            <span>
              Walk • Explore •
              Shop
            </span>
          </div>
        </div>

        <div className="mall-top-actions">
          <button
            type="button"
            onClick={() =>
              setShowControls(
                (value) =>
                  !value,
              )
            }
          >
            <Info size={17} />

            <span>
              Controls
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setShowMap(
                (value) =>
                  !value,
              )
            }
          >
            <Map size={17} />

            <span>
              Map
            </span>
          </button>

          <button
            type="button"
            className="mall-cart-action"
            onClick={() =>
              navigate(
                "/cart",
              )
            }
          >
            <ShoppingCart
              size={18}
            />

            <span>
              Cart
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              document.documentElement.requestFullscreen?.()
            }
          >
            <Maximize2
              size={17}
            />

            <span>
              Full Screen
            </span>
          </button>
        </div>
      </header>

      {/* =================================================
          3D CANVAS
      ================================================= */}

      <main
        className="mall-canvas"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          stopLook
        }
        onPointerCancel={
          stopLook
        }
        onPointerLeave={
          stopLook
        }
      >
        <Canvas
          shadows
          dpr={[
            1,
            Math.min(
              mall.settings
                ?.maxPixelRatio ||
                (isMobile
                  ? 1.25
                  : 1.7),
              isMobile
                ? 1.5
                : 2,
            ),
          ]}
          camera={{
            fov:
              mall.settings
                ?.cameraFov ||
              68,

            near:
              mall.settings
                ?.cameraNear ||
              0.1,

            far:
              mall.settings
                ?.cameraFar ||
              100,

            position: [
              0,
              1.72,
              22,
            ],
          }}
          gl={{
            antialias:
              true,

            powerPreference:
              "high-performance",
          }}
        >
          <Suspense
            fallback={null}
          >
            <MallScene
              mall={mall}
              joystick={
                joystick
              }
              look={look}
              onProductSelect={
                setSelectedProduct
              }
              onStoreSelect={
                setSelectedStore
              }
              onNearbyProduct={
                setNearbyProduct
              }
              onPosition={
                setPosition
              }
            />
          </Suspense>
        </Canvas>

        {/* =================================================
            HUD
        ================================================= */}

        <div className="mall-hud">
          <div className="mall-status-pill">
            <span className="status-dot" />

            LIVE 3D
          </div>

          <div className="mall-position">
            X{" "}
            {position.x.toFixed(
              1,
            )}

            {" · "}

            Z{" "}
            {position.z.toFixed(
              1,
            )}
          </div>
        </div>

        {/* =================================================
            CONTROLS
        ================================================= */}

        {showControls && (
          <div className="mall-instructions">
            <div className="mall-instructions-header">
              <div>
                <strong>
                  Explore JINI
                  Mall
                </strong>

                <span>
                  Walk around
                  and discover
                  real products
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowControls(
                    false,
                  )
                }
                aria-label="Close controls"
              >
                <X size={17} />
              </button>
            </div>

            {!isMobile ? (
              <div className="mall-controls-grid">
                <div>
                  <Gamepad2
                    size={18}
                  />

                  <b>
                    W A S D
                  </b>

                  <small>
                    Move
                  </small>
                </div>

                <div>
                  <Mouse
                    size={18}
                  />

                  <b>
                    Drag
                  </b>

                  <small>
                    Look around
                  </small>
                </div>

                <div>
                  <Camera
                    size={18}
                  />

                  <b>
                    Click
                  </b>

                  <small>
                    Open product
                  </small>
                </div>

                <div>
                  <Eye
                    size={18}
                  />

                  <b>
                    Shift
                  </b>

                  <small>
                    Run faster
                  </small>
                </div>
              </div>
            ) : (
              <div className="mall-mobile-controls">
                <Gamepad2
                  size={18}
                />

                <span>
                  Joystick =
                  walk · Swipe
                  the mall =
                  look around
                </span>
              </div>
            )}
          </div>
        )}

        {/* =================================================
            MOBILE JOYSTICK
        ================================================= */}

        {isMobile &&
          mall.settings
            ?.mobileJoystickEnabled !==
            false && (
            <Joystick
              onMove={(
                x,
                y,
              ) =>
                setJoystick({
                  x,
                  y,
                })
              }
            />
          )}

        {/* =================================================
            NEARBY PRODUCT
        ================================================= */}

        {nearbyProduct && (
          <button
            type="button"
            className="mall-nearby-product"
            onClick={() =>
              setSelectedProduct(
                nearbyProduct,
              )
            }
          >
            <Sparkles
              size={17}
            />

            <span>
              {typeof nearbyProduct.product ===
              "object"
                ? nearbyProduct
                    .product
                    ?.name
                : "View nearby product"}
            </span>

            <ChevronUp
              size={17}
            />
          </button>
        )}

        <div className="mall-bottom-brand">
          <span>
            JINI COSMETICS
          </span>

          <small>
            Beauty beyond
            borders
          </small>
        </div>
      </main>

      {/* =================================================
          MAP
      ================================================= */}

      {showMap && (
        <div
          className="mall-map-overlay"
          onClick={() =>
            setShowMap(false)
          }
        >
          <div
            className="mall-map-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mall-map-header">
              <div>
                <strong>
                  Mall Map
                </strong>

                <span>
                  Select a store
                  to explore
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMap(
                    false,
                  )
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="mall-map-visual">
              <div className="map-lobby">
                LOBBY
              </div>

              <div className="map-store map-makeup">
                MAKEUP
              </div>

              <div className="map-store map-skin">
                SKIN CARE
              </div>

              <div className="map-store map-hair">
                HAIR CARE
              </div>

              <div className="map-store map-fragrance">
                FRAGRANCE
              </div>

              <span
                className="map-player"
                title="Your position"
              >
                ●
              </span>
            </div>

            <div className="mall-map-list">
              {mapStores.map(
                (store) => (
                  <button
                    key={
                      store.storeId
                    }
                    type="button"
                    onClick={() => {
                      setSelectedStore(
                        store,
                      );

                      setShowMap(
                        false,
                      );
                    }}
                  >
                    <span>
                      {
                        store.name
                      }
                    </span>

                    <small>
                      {store.category ||
                        "Beauty store"}
                    </small>
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          STORE PANEL
      ================================================= */}

      {selectedStore && (
        <div
          className="mall-store-panel"
          onClick={() =>
            setSelectedStore(
              null,
            )
          }
        >
          <div
            className="mall-store-panel-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="mall-store-panel-close"
              onClick={() =>
                setSelectedStore(
                  null,
                )
              }
            >
              <X size={18} />
            </button>

            <span>
              {selectedStore.category ||
                "JINI Cosmetics"}
            </span>

            <h2>
              {
                selectedStore.name
              }
            </h2>

            <p>
              {selectedStore.description ||
                "Explore real JINI products inside this store."}
            </p>

            <div className="mall-store-products-heading">
              <strong>
                Products in this
                store
              </strong>

              <small>
                {
                  selectedStoreProducts.length
                }{" "}
                available
              </small>
            </div>

            {selectedStoreProducts.length >
            0 ? (
              <div className="mall-store-products-grid">
                {selectedStoreProducts.map(
                  (
                    location,
                  ) => {
                    const product =
                      typeof location.product ===
                      "object"
                        ? location.product
                        : undefined;

                    const image =
                      getProductImage(
                        product,
                      );

                    return (
                      <button
                        key={
                          location._id ||
                          getProductId(
                            product,
                          )
                        }
                        type="button"
                        className="mall-store-product-card"
                        onClick={() => {
                          setSelectedStore(
                            null,
                          );

                          setSelectedProduct(
                            location,
                          );
                        }}
                      >
                        <div className="mall-store-product-image">
                          {image ? (
                            <img
                              src={
                                image
                              }
                              alt={
                                product?.name ||
                                "Product"
                              }
                            />
                          ) : (
                            <Sparkles
                              size={
                                22
                              }
                            />
                          )}
                        </div>

                        <div className="mall-store-product-copy">
                          <strong>
                            {product?.name ||
                              "Beauty Product"}
                          </strong>

                          <span>
                            {formatPrice(
                              product?.price,
                            )}
                          </span>

                          <small>
                            Open product
                          </small>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="mall-store-empty-products">
                No products have
                been placed in
                this store yet.
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setSelectedStore(
                  null,
                )
              }
            >
              <Eye size={17} />

              Continue
              Exploring
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          PRODUCT MODAL
      ================================================= */}

      {selectedProduct && (
        <ProductModal
          location={
            selectedProduct
          }
          onClose={() =>
            setSelectedProduct(
              null,
            )
          }
        />
      )}

      {/* =================================================
          MOBILE LANDSCAPE
      ================================================= */}

      {isMobile &&
        mall.settings
          ?.forceLandscapeOnMobile !==
          false && (
          <div className="mall-landscape-message">
            <div>
              <RotateCcw
                size={28}
              />

              <strong>
                Use landscape
                mode
              </strong>

              <span>
                Rotate your
                phone for the
                best 3D mall
                experience.
              </span>
            </div>
          </div>
        )}
    </div>
  );
}