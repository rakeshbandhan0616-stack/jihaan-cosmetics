import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  Html,
  KeyboardControls,
  PointerLockControls,
  Text,
  useKeyboardControls,
} from "@react-three/drei";

import * as THREE from "three";

import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Gamepad2,
  Info,
  Map,
  Mouse,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./VirtualMallPage.css";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const MALL_SLUG = "jini-cosmetics-virtual-mall";

/* =========================================================
   TYPES
========================================================= */

type Vector3Value = {
  x: number;
  y: number;
  z: number;
};

type MallStore = {
  storeId: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  subcategory?: string;

  position?: Vector3Value;
  rotation?: Vector3Value;
  scale?: Vector3Value;

  size?: {
    width?: number;
    height?: number;
    depth?: number;
  };

  floorNumber?: number;

  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    interior?: string;
  };

  isActive?: boolean;
  isFeatured?: boolean;
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

  images?: string[];
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

  position: Vector3Value;
  rotation?: Vector3Value;
  scale?: Vector3Value;

  displayType?: string;

  isInteractive?: boolean;
  showProductPopup?: boolean;
  allowAddToCart?: boolean;
  allowViewDetails?: boolean;

  isActive?: boolean;

  sortOrder?: number;
};

type MallData = {
  _id: string;

  name: string;
  slug: string;

  description?: string;

  stores: MallStore[];

  productLocations: ProductLocation[];

  floors?: unknown[];

  spawnPoint?: {
    position?: Vector3Value;
    rotation?: Vector3Value;
  };

  settings?: {
    playerHeight?: number;

    movementSpeed?: number;
    runningSpeed?: number;

    cameraFov?: number;

    productInteractionDistance?: number;

    mobile?: {
      joystick?: boolean;
      swipe?: boolean;
      forceLandscape?: boolean;
    };
  };

  isPublished?: boolean;
  isActive?: boolean;

  maintenanceMode?: boolean;
  maintenanceMessage?: string;
};

type MallApiResponse = {
  success?: boolean;
  mall?: MallData;
  data?: MallData;
  message?: string;
};

type ProductApiResponse = {
  success?: boolean;
  product?: Product;
  data?: Product;
  message?: string;
};

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

function getProductId(product?: Product | string): string {
  if (!product) {
    return "";
  }

  if (typeof product === "string") {
    return product;
  }

  return String(product._id || product.id || "");
}

function getImage(product?: Product): string {
  if (!product) {
    return "";
  }

  return (
    product.images?.[0] ||
    product.hoverImage ||
    ""
  );
}

function getPrice(product?: Product): number {
  return Number(product?.price || 0);
}

function formatPrice(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function vector(
  value?: Vector3Value,
  fallback: Vector3Value = {
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

type Controls = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
};

/* =========================================================
   PLAYER
========================================================= */

type PlayerProps = {
  mall: MallData;

  joystick: {
    x: number;
    y: number;
  };

  onNearbyProduct: (
    productLocation: ProductLocation | null,
  ) => void;
};

function Player({
  mall,
  joystick,
  onNearbyProduct,
}: PlayerProps) {
  const { camera } = useThree();

  const [, getKeys] =
    useKeyboardControls<Controls>();

  const velocity = useRef(
    new THREE.Vector3(),
  );

  const direction = useRef(
    new THREE.Vector3(),
  );

  const lastNearbyProduct =
    useRef<string | null>(null);

  const speed =
    mall.settings?.movementSpeed || 4.5;

  const runSpeed =
    mall.settings?.runningSpeed || 7.5;

  const interactionDistance =
    mall.settings
      ?.productInteractionDistance || 3;

  useEffect(() => {
    const spawn =
      mall.spawnPoint?.position || {
        x: 0,
        y: 1.7,
        z: 16,
      };

    camera.position.set(
      spawn.x,
      spawn.y || 1.7,
      spawn.z,
    );

    camera.rotation.set(
      0,
      mall.spawnPoint?.rotation?.y || Math.PI,
      0,
    );
  }, [camera, mall]);

  useFrame((_, delta) => {
    const keys = getKeys();

    const inputX =
      Number(keys.right) -
      Number(keys.left) +
      joystick.x;

    const inputZ =
      Number(keys.backward) -
      Number(keys.forward) +
      joystick.y;

    direction.current.set(
      inputX,
      0,
      inputZ,
    );

    if (
      direction.current.lengthSq() > 1
    ) {
      direction.current.normalize();
    }

    const activeSpeed =
      keys.run ? runSpeed : speed;

    const movement =
      activeSpeed * delta;

    const forward =
      new THREE.Vector3();

    camera.getWorldDirection(forward);

    forward.y = 0;
    forward.normalize();

    const right =
      new THREE.Vector3();

    right.crossVectors(
      forward,
      camera.up,
    );

    right.normalize();

    velocity.current.set(
      0,
      0,
      0,
    );

    velocity.current.addScaledVector(
      forward,
      -direction.current.z *
        movement,
    );

    velocity.current.addScaledVector(
      right,
      direction.current.x *
        movement,
    );

    const nextX =
      camera.position.x +
      velocity.current.x;

    const nextZ =
      camera.position.z +
      velocity.current.z;

    const boundary = 27;

    camera.position.x =
      THREE.MathUtils.clamp(
        nextX,
        -boundary,
        boundary,
      );

    camera.position.z =
      THREE.MathUtils.clamp(
        nextZ,
        -boundary,
        boundary,
      );

    camera.position.y =
      mall.settings?.playerHeight || 1.7;

    let closest:
      | ProductLocation
      | null = null;

    let closestDistance =
      interactionDistance;

    for (
      const location of
      mall.productLocations || []
    ) {
      if (
        location.isActive === false ||
        location.isInteractive === false
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
        Math.sqrt(
          dx * dx +
          dz * dz,
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
      lastNearbyProduct.current
    ) {
      lastNearbyProduct.current =
        currentId;

      onNearbyProduct(
        closest,
      );
    }
  });

  return null;
}

/* =========================================================
   FLOOR
========================================================= */

function MallFloor() {
  return (
    <group>
      <mesh
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <boxGeometry
          args={[60, 0.1, 60]}
        />

        <meshStandardMaterial
          color="#f4eee9"
          roughness={0.75}
        />
      </mesh>

      <gridHelper
        args={[
          60,
          60,
          "#ddd2ca",
          "#eee7e2",
        ]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

/* =========================================================
   WALLS
========================================================= */

function MallWalls() {
  return (
    <group>
      <mesh
        position={[0, 3, -29]}
        receiveShadow
      >
        <boxGeometry
          args={[60, 6, 0.5]}
        />

        <meshStandardMaterial
          color="#ffffff"
        />
      </mesh>

      <mesh
        position={[-29, 3, 0]}
        receiveShadow
      >
        <boxGeometry
          args={[0.5, 6, 60]}
        />

        <meshStandardMaterial
          color="#ffffff"
        />
      </mesh>

      <mesh
        position={[29, 3, 0]}
        receiveShadow
      >
        <boxGeometry
          args={[0.5, 6, 60]}
        />

        <meshStandardMaterial
          color="#ffffff"
        />
      </mesh>

      <mesh
        position={[0, 3, 29]}
        receiveShadow
      >
        <boxGeometry
          args={[60, 6, 0.5]}
        />

        <meshStandardMaterial
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   CEILING LIGHTS
========================================================= */

function CeilingLights() {
  const positions = [
    [-18, 5.5, -18],
    [-6, 5.5, -18],
    [6, 5.5, -18],
    [18, 5.5, -18],

    [-18, 5.5, -6],
    [-6, 5.5, -6],
    [6, 5.5, -6],
    [18, 5.5, -6],

    [-18, 5.5, 6],
    [-6, 5.5, 6],
    [6, 5.5, 6],
    [18, 5.5, 6],

    [-18, 5.5, 18],
    [-6, 5.5, 18],
    [6, 5.5, 18],
    [18, 5.5, 18],
  ];

  return (
    <group>
      {positions.map(
        (position, index) => (
          <pointLight
            key={index}
            position={
              position as [
                number,
                number,
                number,
              ]
            }
            intensity={18}
            distance={13}
            decay={2}
          />
        ),
      )}
    </group>
  );
}

/* =========================================================
   STORE
========================================================= */

type StoreProps = {
  store: MallStore;
  onSelect: (store: MallStore) => void;
};

function Store({
  store,
  onSelect,
}: StoreProps) {
  const position = vector(
    store.position,
  );

  const rotation = vector(
    store.rotation,
  );

  const scale = vector(
    store.scale,
    {
      x: 1,
      y: 1,
      z: 1,
    },
  );

  const width =
    store.size?.width || 10;

  const height =
    store.size?.height || 4;

  const depth =
    store.size?.depth || 10;

  const primary =
    store.colors?.primary ||
    "#d9a6a6";

  const secondary =
    store.colors?.secondary ||
    "#fff8f6";

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(store);
      }}
    >
      <mesh
        position={[
          0,
          height / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width,
            height,
            depth,
          ]}
        />

        <meshStandardMaterial
          color={secondary}
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          height * 0.7,
          depth / 2 + 0.05,
        ]}
      >
        <boxGeometry
          args={[
            width * 0.95,
            height * 0.45,
            0.1,
          ]}
        />

        <meshStandardMaterial
          color={primary}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.5,
          depth / 2 + 0.12,
        ]}
      >
        <boxGeometry
          args={[2.5, 3, 0.15]}
        />

        <meshStandardMaterial
          color="#29201f"
          transparent
          opacity={0.7}
        />
      </mesh>

      <Text
        position={[
          0,
          height * 0.9,
          depth / 2 + 0.25,
        ]}
        fontSize={0.65}
        color="#241b1b"
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 1}
      >
        {store.name}
      </Text>

      <Text
        position={[
          0,
          height * 0.55,
          depth / 2 + 0.25,
        ]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        ENTER STORE
      </Text>

      <Shelf
        position={[
          -width / 2 + 1.4,
          1.2,
          -depth / 2 + 2,
        ]}
      />

      <Shelf
        position={[
          width / 2 - 1.4,
          1.2,
          -depth / 2 + 2,
        ]}
      />

      <Shelf
        position={[
          -width / 2 + 1.4,
          1.2,
          -depth / 2 + 5,
        ]}
      />

      <Shelf
        position={[
          width / 2 - 1.4,
          1.2,
          -depth / 2 + 5,
        ]}
      />
    </group>
  );
}

/* =========================================================
   SHELF
========================================================= */

function Shelf({
  position,
}: {
  position: [
    number,
    number,
    number,
  ];
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry
          args={[1.2, 2.2, 3]}
        />

        <meshStandardMaterial
          color="#c9b2a7"
        />
      </mesh>

      <mesh
        position={[0, 1.1, 0]}
      >
        <boxGeometry
          args={[1.4, 0.1, 3.2]}
        />

        <meshStandardMaterial
          color="#8d6f63"
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   PRODUCT DISPLAY
========================================================= */

type ProductDisplayProps = {
  location: ProductLocation;

  onSelect: (
    location: ProductLocation,
  ) => void;
};

function ProductDisplay({
  location,
  onSelect,
}: ProductDisplayProps) {
  const [hovered, setHovered] =
    useState(false);

  const product =
    typeof location.product ===
    "object"
      ? location.product
      : undefined;

  if (
    location.isActive === false
  ) {
    return null;
  }

  const position = vector(
    location.position,
  );

  const rotation = vector(
    location.rotation,
  );

  const scale = vector(
    location.scale,
    {
      x: 1,
      y: 1,
      z: 1,
    },
  );

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
      onClick={(event) => {
        event.stopPropagation();

        if (
          location.isInteractive !==
          false
        ) {
          onSelect(location);
        }
      }}
    >
      <mesh
        position={[0, -0.6, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.65,
            0.75,
            0.35,
            32,
          ]}
        />

        <meshStandardMaterial
          color={
            hovered
              ? "#e8b5b5"
              : "#d5c0b8"
          }
        />
      </mesh>

      <mesh
        castShadow
        position={[
          0,
          0.25,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.27,
            0.32,
            1.2,
            24,
          ]}
        />

        <meshStandardMaterial
          color={
            location.storeId ===
            "skin-care"
              ? "#f0c6a8"
              : location.storeId ===
                  "makeup"
                ? "#9e4c63"
                : "#c7a36a"
          }
          metalness={0.05}
          roughness={0.4}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.9,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.29,
            0.29,
            0.12,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#252020"
        />
      </mesh>

      {hovered && (
        <pointLight
          position={[
            0,
            1,
            0,
          ]}
          intensity={7}
          distance={4}
        />
      )}

      {product?.name && (
        <Text
          position={[
            0,
            1.45,
            0,
          ]}
          fontSize={0.22}
          color="#332626"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.5}
        >
          {product.name}
        </Text>
      )}

      {hovered && (
        <Html
          position={[
            0,
            2,
            0,
          ]}
          center
        >
          <div className="mall-world-label">
            <Sparkles size={13} />
            Click to view
          </div>
        </Html>
      )}
    </group>
  );
}

/* =========================================================
   ENTRANCE
========================================================= */

function MallEntrance() {
  return (
    <group
      position={[0, 0, 23]}
    >
      <mesh
        position={[
          0,
          2.5,
          -0.5,
        ]}
        castShadow
      >
        <boxGeometry
          args={[14, 5, 1]}
        />

        <meshStandardMaterial
          color="#21191a"
        />
      </mesh>

      <Text
        position={[
          0,
          3,
          0.1,
        ]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        JINI COSMETICS
      </Text>

      <Text
        position={[
          0,
          2,
          0.1,
        ]}
        fontSize={0.45}
        color="#f0c6c6"
        anchorX="center"
        anchorY="middle"
      >
        VIRTUAL BEAUTY MALL
      </Text>
    </group>
  );
}

/* =========================================================
   MALL SCENE
========================================================= */

type MallSceneProps = {
  mall: MallData;

  joystick: {
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
};

function MallScene({
  mall,
  joystick,
  onProductSelect,
  onStoreSelect,
  onNearbyProduct,
}: MallSceneProps) {
  return (
    <>
      <color
        attach="background"
        args={["#f6efec"]}
      />

      <fog
        attach="fog"
        args={[
          "#f6efec",
          18,
          55,
        ]}
      />

      <ambientLight
        intensity={1.2}
      />

      <directionalLight
        position={[
          10,
          18,
          10,
        ]}
        intensity={2.5}
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

      <MallWalls />

      <MallEntrance />

      {mall.stores
        ?.filter(
          (store) =>
            store.isActive !==
            false,
        )
        .map((store) => (
          <Store
            key={store.storeId}
            store={store}
            onSelect={
              onStoreSelect
            }
          />
        ))}

      {mall.productLocations
        ?.filter(
          (location) =>
            location.isActive !==
            false,
        )
        .map((location) => (
          <ProductDisplay
            key={
              location._id ||
              `${location.storeId}-${location.position.x}-${location.position.z}`
            }
            location={location}
            onSelect={
              onProductSelect
            }
          />
        ))}

      <Player
        mall={mall}
        joystick={joystick}
        onNearbyProduct={
          onNearbyProduct
        }
      />

      <PointerLockControls />
    </>
  );
}

/* =========================================================
   JOYSTICK
========================================================= */

type JoystickProps = {
  onMove: (
    x: number,
    y: number,
  ) => void;
};

function Joystick({
  onMove,
}: JoystickProps) {
  const active = useRef(false);

  const center = useRef({
    x: 0,
    y: 0,
  });

  const update = (
    event:
      | React.PointerEvent
      | PointerEvent,
  ) => {
    if (!active.current) {
      return;
    }

    const rect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();

    const centerX =
      rect.left +
      rect.width / 2;

    const centerY =
      rect.top +
      rect.height / 2;

    const dx =
      event.clientX -
      centerX;

    const dy =
      event.clientY -
      centerY;

    const max =
      rect.width / 2;

    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy,
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

    center.current = {
      x,
      y,
    };

    onMove(x, y);
  };

  const reset = () => {
    active.current = false;

    center.current = {
      x: 0,
      y: 0,
    };

    onMove(0, 0);
  };

  return (
    <div
      className="mall-joystick"
      onPointerDown={(event) => {
        active.current = true;

        event.currentTarget.setPointerCapture(
          event.pointerId,
        );

        update(event);
      }}
      onPointerMove={update}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={() => {
        if (active.current) {
          reset();
        }
      }}
    >
      <div
        className="mall-joystick-knob"
        style={{
          transform: `translate(
            ${center.current.x * 25}px,
            ${center.current.y * 25}px
          )`,
        }}
      />
    </div>
  );
}

/* =========================================================
   PRODUCT MODAL
========================================================= */

type ProductModalProps = {
  location: ProductLocation;
  onClose: () => void;
};

function ProductModal({
  location,
  onClose,
}: ProductModalProps) {
  const navigate =
    useNavigate();

  const product =
    typeof location.product ===
    "object"
      ? location.product
      : undefined;

  const [adding, setAdding] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const productId =
    getProductId(product);

  const image =
    getImage(product);

  const price =
    getPrice(product);

  const oldPrice =
    Number(
      product?.oldPrice || 0,
    );

  const addToCart =
    async () => {
      if (!productId) {
        setMessage(
          "Product ID is missing.",
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        navigate("/login", {
          state: {
            redirectTo:
              "/virtual-mall",
          },
        });

        return;
      }

      if (
        Number(product?.stock || 0) <=
          0 ||
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

        const response =
          await fetch(
            `${API_BASE_URL}/cart/items`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              credentials:
                "include",

              body: JSON.stringify({
                productId,
                quantity: 1,
                size: "Standard",
              }),
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
          data.success === false
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
          error instanceof Error
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
          onClick={onClose}
          type="button"
          aria-label="Close"
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
                size={50}
              />
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
              "Product"}
          </h2>

          <p className="mall-product-brand">
            {product?.brand ||
              "JINI Cosmetics"}
          </p>

          <p className="mall-product-description">
            {product?.description ||
              "Discover this product from the Jini Cosmetics virtual mall."}
          </p>

          <div className="mall-price-row">
            <strong>
              {formatPrice(price)}
            </strong>

            {oldPrice > price && (
              <del>
                {formatPrice(
                  oldPrice,
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
              onClick={
                addToCart
              }
              disabled={adding}
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
              onClick={() => {
                if (!productId) {
                  return;
                }

                navigate(
                  `/products/${encodeURIComponent(
                    productId,
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
   MAIN PAGE
========================================================= */

export default function VirtualMallPage() {
  const navigate =
    useNavigate();

  const [mall, setMall] =
    useState<MallData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<ProductLocation | null>(
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
    selectedStore,
    setSelectedStore,
  ] =
    useState<MallStore | null>(
      null,
    );

  const [
    showMap,
    setShowMap,
  ] = useState(false);

  const [
    showInstructions,
    setShowInstructions,
  ] = useState(true);

  const [
    joystick,
    setJoystick,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    isMobile,
    setIsMobile,
  ] = useState(false);

  const [
    touchStart,
    setTouchStart,
  ] = useState<{
    x: number;
    y: number;
  } | null>(null);

  /* =======================================================
     DEVICE
  ======================================================= */

  useEffect(() => {
    const checkMobile =
      () => {
        setIsMobile(
          window.innerWidth <=
            900 ||
            "ontouchstart" in
              window,
        );
      };

    checkMobile();

    window.addEventListener(
      "resize",
      checkMobile,
    );

    return () =>
      window.removeEventListener(
        "resize",
        checkMobile,
      );
  }, []);

  /* =======================================================
     FETCH MALL
  ======================================================= */

  const loadMall =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `${API_BASE_URL}/virtual-mall/slug/${encodeURIComponent(
                MALL_SLUG,
              )}`,
              {
                method: "GET",
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
              )) as MallApiResponse;

          if (!response.ok) {
            throw new Error(
              data.message ||
                `Virtual Mall request failed (${response.status}).`,
            );
          }

          const mallData =
            data.mall ||
            data.data;

          if (!mallData) {
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

          setMall(
            mallData,
          );
        } catch (fetchError) {
          console.error(
            "Virtual Mall loading error:",
            fetchError,
          );

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load Virtual Mall.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadMall();
  }, [loadMall]);

  /* =======================================================
     TOUCH SWIPE
  ======================================================= */

  const handleTouchStart =
    (
      event: React.TouchEvent,
    ) => {
      if (
        event.touches.length !==
        1
      ) {
        return;
      }

      setTouchStart({
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
    };

  const handleTouchMove =
    (
      event: React.TouchEvent,
    ) => {
      if (
        !touchStart ||
        event.touches.length !==
          1
      ) {
        return;
      }

      const currentX =
        event.touches[0].clientX;

      const currentY =
        event.touches[0].clientY;

      const dx =
        currentX -
        touchStart.x;

      const dy =
        currentY -
        touchStart.y;

      if (
        Math.abs(dx) > 35 ||
        Math.abs(dy) > 35
      ) {
        setTouchStart({
          x: currentX,
          y: currentY,
        });
      }
    };

  const handleTouchEnd =
    () => {
      setTouchStart(null);
    };

  /* =======================================================
     STORE SELECTION
  ======================================================= */

  const handleStoreSelect =
    (store: MallStore) => {
      setSelectedStore(store);
    };

  /* =======================================================
     PRODUCT SELECTION
  ======================================================= */

  const handleProductSelect =
    async (
      location: ProductLocation,
    ) => {
      if (
        location.isInteractive ===
        false
      ) {
        return;
      }

      if (
        typeof location.product ===
        "object"
      ) {
        setSelectedProduct(
          location,
        );

        return;
      }

      const productId =
        getProductId(
          location.product,
        );

      if (!productId) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/products/${encodeURIComponent(
              productId,
            )}`,
          );

        const data =
          (await response
            .json()
            .catch(
              () => ({}),
            )) as ProductApiResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load product.",
          );
        }

        const product =
          data.product ||
          data.data;

        if (!product) {
          throw new Error(
            "Product data was not returned.",
          );
        }

        setSelectedProduct({
          ...location,
          product,
        });
      } catch (productError) {
        console.error(
          "Virtual Mall product loading error:",
          productError,
        );

        alert(
          productError instanceof
            Error
            ? productError.message
            : "Unable to load product.",
        );
      }
    };

  /* =======================================================
     STORE MAP
  ======================================================= */

  const storeMarkers =
    useMemo(() => {
      if (!mall) {
        return [];
      }

      return mall.stores.filter(
        (store) =>
          store.isActive !==
          false,
      );
    }, [mall]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="virtual-mall-page mall-loading">
        <div className="mall-loading-card">
          <div className="mall-loading-spinner" />

          <Sparkles size={26} />

          <h2>
            Entering JINI Virtual Mall
          </h2>

          <p>
            Preparing the 3D beauty
            experience...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !mall) {
    return (
      <div className="virtual-mall-page mall-error-page">
        <div className="mall-error-card">
          <Info size={42} />

          <h1>
            Virtual Mall
          </h1>

          <p>
            {error ||
              "Virtual Mall could not be loaded."}
          </p>

          <div className="mall-error-actions">
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
              Back to JINI Cosmetics
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      className="virtual-mall-page"
      onTouchStart={
        handleTouchStart
      }
      onTouchMove={
        handleTouchMove
      }
      onTouchEnd={
        handleTouchEnd
      }
    >
      {/* ===================================================
          TOP BAR
      =================================================== */}

      <div className="mall-topbar">
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

          <div>
            <strong>
              JINI COSMETICS
            </strong>

            <span>
              Virtual Mall
            </span>
          </div>
        </div>

        <div className="mall-top-actions">
          <button
            type="button"
            onClick={() =>
              setShowInstructions(
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
            onClick={() =>
              navigate("/cart")
            }
          >
            <ShoppingCart
              size={18}
            />

            <span>
              Cart
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================
          3D CANVAS
      =================================================== */}

      <div className="mall-canvas">
        <Canvas
          shadows
          camera={{
            fov:
              mall.settings
                ?.cameraFov ||
              70,

            near: 0.1,

            far: 100,

            position: [
              0,
              1.7,
              20,
            ],
          }}
          dpr={[
            1,
            mall.settings
              ?.cameraFov
              ? 1.5
              : 1.75,
          ]}
        >
          <KeyboardControls
            map={[
              {
                name: "forward",
                keys: [
                  "ArrowUp",
                  "w",
                  "W",
                ],
              },
              {
                name: "backward",
                keys: [
                  "ArrowDown",
                  "s",
                  "S",
                ],
              },
              {
                name: "left",
                keys: [
                  "ArrowLeft",
                  "a",
                  "A",
                ],
              },
              {
                name: "right",
                keys: [
                  "ArrowRight",
                  "d",
                  "D",
                ],
              },
              {
                name: "run",
                keys: [
                  "Shift",
                ],
              },
            ]}
          >
            <Suspense
              fallback={null}
            >
              <MallScene
                mall={mall}
                joystick={
                  joystick
                }
                onProductSelect={
                  handleProductSelect
                }
                onStoreSelect={
                  handleStoreSelect
                }
                onNearbyProduct={
                  setNearbyProduct
                }
              />
            </Suspense>
          </KeyboardControls>
        </Canvas>
      </div>

      {/* ===================================================
          CONTROL PANEL
      =================================================== */}

      {showInstructions && (
        <div className="mall-instructions">
          <div className="mall-instructions-header">
            <div>
              <strong>
                Explore JINI Mall
              </strong>

              <span>
                Walk around and discover products
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowInstructions(
                  false,
                )
              }
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

                <span>
                  W A S D
                </span>

                <small>
                  Move
                </small>
              </div>

              <div>
                <Mouse
                  size={18}
                />

                <span>
                  Mouse
                </span>

                <small>
                  Look around
                </small>
              </div>

              <div>
                <Camera
                  size={18}
                />

                <span>
                  Click
                </span>

                <small>
                  Enter 3D view
                </small>
              </div>

              <div>
                <Eye
                  size={18}
                />

                <span>
                  Shift
                </span>

                <small>
                  Run
                </small>
              </div>
            </div>
          ) : (
            <div className="mall-mobile-controls">
              <Gamepad2
                size={18}
              />

              <span>
                Use the joystick to walk
                around the mall.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          MOBILE JOYSTICK
      =================================================== */}

      {isMobile && (
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

      {/* ===================================================
          NEARBY PRODUCT
      =================================================== */}

      {nearbyProduct && (
        <button
          type="button"
          className="mall-nearby-product"
          onClick={() =>
            handleProductSelect(
              nearbyProduct,
            )
          }
        >
          <Sparkles
            size={18}
          />

          <span>
            {typeof nearbyProduct.product ===
            "object"
              ? nearbyProduct
                  .product?.name
              : "View Product"}
          </span>

          <ChevronUp
            size={17}
          />
        </button>
      )}

      {/* ===================================================
          MAP
      =================================================== */}

      {showMap && (
        <div className="mall-map-overlay">
          <div className="mall-map-card">
            <div className="mall-map-header">
              <div>
                <strong>
                  Mall Map
                </strong>

                <span>
                  Select a store
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMap(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="mall-map-grid">
              {storeMarkers.map(
                (store) => (
                  <button
                    key={
                      store.storeId
                    }
                    type="button"
                    className="mall-map-store"
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
                      {store.name}
                    </span>

                    <small>
                      {store.category ||
                        "Store"}
                    </small>
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          SELECTED STORE
      =================================================== */}

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
              {selectedStore.name}
            </h2>

            <p>
              {selectedStore.description ||
                "Explore products in this JINI Cosmetics store."}
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedStore(
                  null,
                );
              }}
            >
              <Eye size={17} />
              Explore Store
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          PRODUCT MODAL
      =================================================== */}

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

      {/* ===================================================
          MOBILE LANDSCAPE MESSAGE
      =================================================== */}

      {isMobile && (
        <div className="mall-landscape-message">
          <div>
            <ChevronDown
              size={32}
            />

            <strong>
              Rotate your device
            </strong>

            <span>
              For the best virtual mall
              experience, use landscape
              mode.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}