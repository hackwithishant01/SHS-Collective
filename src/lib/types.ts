export type ProductCondition = "new" | "pre_owned";
export type ProductStatus = "draft" | "published" | "archived";
export type FulfilmentMethod = "shipping" | "pickup";
export type StockPolicy = "enquiry" | "reserve";
export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "shipped"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type AdminRole = "owner" | "staff";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  productCount?: number;
}

export interface ProductImageDto {
  id: string;
  key: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  sku: string | null;
  stockQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  condition: ProductCondition;
  pricePaise: number;
  compareAtPricePaise: number | null;
  status: ProductStatus;
  featured: boolean;
  isDemo: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  categoryId: string | null;
  image: ProductImageDto | null;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  totalStock: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  measurements: string;
  sku: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  updatedAt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PublicSettings {
  whatsappNumber: string;
  instagramUrl: string;
  supportEmail: string;
  domain: string;
  shippingFlatPaise: number | null;
  freeShippingThresholdPaise: number | null;
  pickupEnabled: boolean;
  pickupInstructions: string;
  stockPolicy: StockPolicy;
  reservationMinutes: number;
  policiesApproved: boolean;
  shippingPolicy: string;
  returnsPolicy: string;
  privacyPolicy: string;
  termsPolicy: string;
  aboutText: string;
  faq: FaqItem[];
  heroImageUrl: string | null;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubhead: string;
  currency: "INR";
}

export interface AdminSettings extends PublicSettings {
  launchApproved: boolean;
  updatedAt: string;
  heroImageKey: string | null;
}

export interface OrderItemSnapshot {
  id: string;
  productId: string | null;
  variantId: string | null;
  productTitle: string;
  productSlug: string;
  variantLabel: string;
  condition: ProductCondition;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface OrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  fulfilmentMethod: FulfilmentMethod;
  customerName: string;
  phone: string;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  shippingPending: boolean;
  stockPolicy: StockPolicy;
  stockDeducted: boolean;
  reservationExpiresAt: string | null;
  createdAt: string;
  itemCount: number;
}

export interface OrderDetail extends OrderSummary {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  landmark: string | null;
  notes: string | null;
  items: OrderItemSnapshot[];
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: OrderStatus;
    note: string | null;
    createdAt: string;
    adminName: string | null;
  }>;
  updatedAt: string;
}

export interface OrderCreationResult {
  orderId: string;
  reference: string;
  status: OrderStatus;
  whatsappUrl: string;
  message: string;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  shippingPending: boolean;
  reservationExpiresAt: string | null;
  duplicate: boolean;
}

export interface ProductFilters {
  q?: string;
  categories?: string[];
  sizes?: string[];
  colors?: string[];
  condition?: ProductCondition | "all";
  availability?: "all" | "in_stock";
  minPricePaise?: number;
  maxPricePaise?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
  featuredOnly?: boolean;
  includeDemo?: boolean;
}

export interface ProductListResult {
  products: ProductSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface FacetData {
  categories: Category[];
  sizes: string[];
  colors: string[];
  minPricePaise: number;
  maxPricePaise: number;
}

export interface DashboardStats {
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  lowStockVariants: number;
  pendingOrders: number;
  ordersThisMonth: number;
  recentOrders: OrderSummary[];
}
