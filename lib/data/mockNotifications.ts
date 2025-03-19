import { Notification } from "../types/notification";

// Mock notification data
export const mockNotifications: Notification[] = [
  {
    id: "notif1",
    title: "Feeding time for Whiskers",
    message: "It's time to feed Whiskers according to the schedule.",
    type: "feeding",
    isRead: false,
    createdAt: new Date(2025, 2, 15, 17, 30), // March 15, 2025, 5:30 PM
    userId: "user1",
    catId: "cat1",
    actionUrl: "/cats/cat1",
    icon: "utensils"
  },
  {
    id: "notif2",
    title: "Missed feeding alert",
    message: "You missed feeding Mittens at the scheduled time of 12:00 PM.",
    type: "warning",
    isRead: false,
    createdAt: new Date(2025, 2, 15, 14, 45), // March 15, 2025, 2:45 PM
    userId: "user1",
    catId: "cat2", 
    actionUrl: "/cats/cat2",
    icon: "alert-triangle"
  },
  {
    id: "notif3",
    title: "New household member",
    message: "Jane Smith has joined your household.",
    type: "household",
    isRead: true,
    createdAt: new Date(2025, 2, 15, 10, 12), // March 15, 2025, 10:12 AM
    userId: "user1",
    householdId: "household1",
    actionUrl: "/households/household1",
    icon: "users"
  },
  {
    id: "notif4",
    title: "Schedule updated",
    message: "The feeding schedule for Oliver has been updated.",
    type: "system",
    isRead: true,
    createdAt: new Date(2025, 2, 14, 19, 25), // March 14, 2025, 7:25 PM
    userId: "user1",
    catId: "cat3",
    actionUrl: "/cats/cat3",
    icon: "bell"
  },
  {
    id: "notif5",
    title: "Low food alert",
    message: "Your cat food supplies are running low. Consider restocking soon.",
    type: "info",
    isRead: true,
    createdAt: new Date(2025, 2, 14, 11, 0), // March 14, 2025, 11:00 AM
    userId: "user1",
    icon: "info"
  }
];
