// src/types/notification.types.ts
//
// The notifications log (design doc 5.8), mirroring the backend
// NotificationLog DTO. Owner monitoring view; no money redaction.
import type { IPaginationMeta } from "./api";

export type NotifChannel = "EMAIL" | "SMS";
export type NotifStatus = "FAILED" | "QUEUED" | "SENT";

export interface INotification {
  id: string;
  channel: NotifChannel;
  event: string;
  recipient: string;
  preview: string | null;
  status: NotifStatus;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface INotificationListResponse {
  message: string;
  data: INotification[];
  meta: IPaginationMeta;
}

export interface INotificationListQuery {
  page?: number;
  limit?: number;
  channel?: NotifChannel;
  status?: NotifStatus;
  event?: string;
  search?: string;
}
