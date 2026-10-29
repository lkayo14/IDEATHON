export interface CommunityStore {
  id: string;
  vendorId?: string;
  name: string;
  slug: string;
  description?: string | null;
  segment?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  instagram?: string | null;
  businessHours?: string | null;
  paymentMethods?: string | null;
  paymentInstructions?: string | null;
  deliveryInfo?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface VendorPreset {
  id: string;
  name: string;
  phone: string;
  storeName: string;
  storeSlug: string;
  segment: string;
  isNew?: boolean;
}
