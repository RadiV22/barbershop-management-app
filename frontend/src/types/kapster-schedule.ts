export type ScheduleStatus =
  | "HELD"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "NO_SHOW";

export type ScheduleServiceStatus = "WAITING" | "IN_SERVICE" | "COMPLETED";

export interface ScheduleCustomer {
  id: number;
  name: string;
}

export interface ScheduleItem {
  serviceName: string;
  quantity: number;
  duration: number;
}

export interface KapsterScheduleEntry {
  id: number;
  source: "ONLINE" | "WALK_IN";
  status: ScheduleStatus;
  displayStatus: ScheduleStatus;

  startsAt: string;
  endsAt: string;
  blockedUntil: string;
  holdExpiresAt: string | null;

  customer: ScheduleCustomer;

  bookingId: number | null;
  orderId: number | null;
  serviceStatus: ScheduleServiceStatus | null;
  paymentStatus: "UNPAID" | "PAID" | null;

  items: ScheduleItem[];
  isBlocking: boolean;
  isOverdue: boolean;
}

export interface UnscheduledOrder {
  id: number;
  serviceStatus: ScheduleServiceStatus;
  checkInAt: string;
  customer: ScheduleCustomer;
}

export interface OverdueOrder {
  id: number;
  customer: ScheduleCustomer;
  schedule: {
    id: number;
    startsAt: string;
    endsAt: string;
    blockedUntil: string;
  } | null;
}

export interface KapsterScheduleData {
  date: string;
  timezone: string;
  serverNow: string;

  kapster: {
    id: number;
    name: string;
    isActive: boolean;
  };

  schedules: KapsterScheduleEntry[];
  unscheduledOrders: UnscheduledOrder[];
  overdueOrders: OverdueOrder[];
}

export interface KapsterScheduleResponse {
  message: string;
  data: KapsterScheduleData;
}
