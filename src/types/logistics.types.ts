// src/types/logistics.types.ts
//
// The logistics registries behind shipments: the drivers directory
// (`/admin/drivers`, supplier-shaped incl. the optional photo) and the saved
// delivery addresses (`/admin/delivery-addresses`, JSON only). Both mirror the
// backend DTOs and reuse the shared registry list envelope/query shapes.
import type { IRegistryListQuery } from "./registry.types";

/** Mirrors the backend driver DTO (envelope key `driver`). */
export interface IDriver {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  city: string | null;
  licenseNo: string | null;
  idNumber: string | null;
  notes: string | null;
  /** This driver's standing haulage terms, or null for the system default. */
  paymentPolicyId: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the backend delivery-address DTO (envelope key `address`). */
export interface IDeliveryAddress {
  id: string;
  label: string;
  city: string;
  area: string | null;
  digitalAddress: string | null;
  landmark: string | null;
  shopName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  directions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDriverResponse {
  message: string;
  data: { driver: IDriver };
}

export interface IDeliveryAddressResponse {
  message: string;
  data: { address: IDeliveryAddress };
}

/** Both directories filter with the standard registry list params. */
export type IDriverListQuery = IRegistryListQuery;
export type IDeliveryAddressListQuery = IRegistryListQuery;

/** Mirrors backend `createDriverSchema` / `updateDriverSchema`. */
export interface ICreateDriverInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  city?: string;
  licenseNo?: string;
  idNumber?: string;
  notes?: string;
}
export interface IUpdateDriverInput {
  name?: string;
  phone?: string;
  email?: string | null;
  company?: string | null;
  city?: string | null;
  licenseNo?: string | null;
  idNumber?: string | null;
  notes?: string | null;
  /** Clears the existing photo (the backend deletes the Cloudinary asset). */
  removePhoto?: boolean;
}

/** Mirrors backend `createDeliveryAddressSchema` / `updateDeliveryAddressSchema`. */
export interface ICreateDeliveryAddressInput {
  label: string;
  city: string;
  area?: string;
  digitalAddress?: string;
  landmark?: string;
  shopName?: string;
  contactName?: string;
  contactPhone?: string;
  directions?: string;
}
export interface IUpdateDeliveryAddressInput {
  label?: string;
  city?: string;
  area?: string | null;
  digitalAddress?: string | null;
  landmark?: string | null;
  shopName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  directions?: string | null;
}
