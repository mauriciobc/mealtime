// Sample data for the app
// In a real app, this would come from a database
import { Cat, FeedingLog, Household, User } from "./types";
import prisma from "./prisma";

// Legacy cat profiles for compatibility
export const catProfiles = [
  {
    id: "cat1",
    name: "Whiskers",
    avatar: "/placeholder.svg?height=200&width=200",
    regularAmount: "1/2",
    foodUnit: "cup",
    feedingInterval: 12,
    lastFed: "2025-03-14T07:30:00.000Z", // This would be dynamic in a real app
    feedingHistory: [
      { time: "2025-03-14T07:30:00.000Z", amount: "1/2" },
      { time: "2025-03-13T19:30:00.000Z", amount: "1/2" },
      { time: "2025-03-13T07:30:00.000Z", amount: "1/2" },
      { time: "2025-03-12T19:30:00.000Z", amount: "1/2" },
    ],
  },
  {
    id: "cat2",
    name: "Mittens",
    avatar: "/placeholder.svg?height=200&width=200",
    regularAmount: "1",
    foodUnit: "can",
    feedingInterval: 24,
    lastFed: "2025-03-13T18:00:00.000Z", // This would be dynamic in a real app
    feedingHistory: [
      { time: "2025-03-13T18:00:00.000Z", amount: "1" },
      { time: "2025-03-12T18:00:00.000Z", amount: "1" },
      { time: "2025-03-11T18:00:00.000Z", amount: "1" },
    ],
  },
  {
    id: "cat3",
    name: "Shadow",
    avatar: "/placeholder.svg?height=200&width=200",
    regularAmount: "1/3",
    foodUnit: "cup",
    feedingInterval: 8,
    lastFed: "2025-03-14T06:00:00.000Z", // This would be dynamic in a real app
    feedingHistory: [
      { time: "2025-03-14T06:00:00.000Z", amount: "1/3" },
      { time: "2025-03-13T22:00:00.000Z", amount: "1/3" },
      { time: "2025-03-13T14:00:00.000Z", amount: "1/3" },
      { time: "2025-03-13T06:00:00.000Z", amount: "1/3" },
    ],
  },
]

// Mock users
export const mockUsers: User[] = [
  {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=100&width=100",
    households: ["household1"],
    primaryHousehold: "household1",
    preferences: {
      timezone: "America/New_York",
      language: "en-US",
      notifications: {
        pushEnabled: true,
        emailEnabled: false,
        feedingReminders: true,
        missedFeedingAlerts: true,
        householdUpdates: true,
      },
    },
  },
  {
    id: "user2",
    name: "Jane Smith",
    email: "jane@example.com",
    avatar: "/placeholder.svg?height=100&width=100",
    households: ["household1"],
    primaryHousehold: "household1",
    preferences: {
      timezone: "America/Los_Angeles",
      language: "en-US",
      notifications: {
        pushEnabled: true,
        emailEnabled: true,
        feedingReminders: true,
        missedFeedingAlerts: true,
        householdUpdates: false,
      },
    },
  },
]

// Mock households
export const mockHouseholds: Household[] = [
  {
    id: "household1",
    name: "Doe Family",
    inviteCode: "DOE123",
    members: [
      { userId: "user1", role: "Admin", joinedAt: new Date("2025-01-01") },
      { userId: "user2", role: "Member", joinedAt: new Date("2025-01-05") },
    ],
    cats: ["cat1", "cat2", "cat3"],
    catGroups: [
      {
        id: "group1",
        name: "All Cats",
        catIds: ["cat1", "cat2", "cat3"],
      },
      {
        id: "group2",
        name: "Morning Feeding",
        catIds: ["cat1", "cat3"],
      },
    ],
  },
]

// Enhanced mock cat data
export const mockCats: Cat[] = [
  {
    id: "cat1",
    name: "Whiskers",
    avatar: "/placeholder.svg?height=200&width=200",
    birthdate: new Date("2023-03-15"),
    weight: 4.5,
    dietaryRestrictions: ["Grain-free"],
    medicalNotes: "Sensitive stomach, needs special diet",
    regularAmount: "1/2",
    foodUnit: "cup",
    feedingSchedules: [
      {
        id: "schedule1",
        type: "interval",
        interval: 12,
        isActive: true,
        isOverride: false,
      },
    ],
    householdId: "household1",
  },
  {
    id: "cat2",
    name: "Mittens",
    avatar: "/placeholder.svg?height=200&width=200",
    birthdate: new Date("2022-06-10"),
    weight: 5.2,
    regularAmount: "1",
    foodUnit: "can",
    feedingSchedules: [
      {
        id: "schedule2",
        type: "fixedTime",
        times: ["18:00"],
        isActive: true,
        isOverride: false,
      },
    ],
    householdId: "household1",
  },
  {
    id: "cat3",
    name: "Shadow",
    avatar: "/placeholder.svg?height=200&width=200",
    birthdate: new Date("2021-12-25"),
    weight: 6.0,
    dietaryRestrictions: ["Low calorie"],
    medicalNotes: "On diet for weight management",
    regularAmount: "1/3",
    foodUnit: "cup",
    feedingSchedules: [
      {
        id: "schedule3",
        type: "interval",
        interval: 8,
        isActive: true,
        isOverride: false,
      },
    ],
    householdId: "household1",
  },
]

// Mock feeding logs
export const mockFeedingLogs: FeedingLog[] = [
  {
    id: "log1",
    catId: "cat1",
    userId: "user1",
    timestamp: new Date("2025-03-14T07:30:00.000Z"),
    amount: "1/2",
    isCompleted: true,
  },
  {
    id: "log2",
    catId: "cat1",
    userId: "user2",
    timestamp: new Date("2025-03-13T19:30:00.000Z"),
    amount: "1/2",
    isCompleted: true,
  },
  {
    id: "log3",
    catId: "cat1",
    userId: "user1",
    timestamp: new Date("2025-03-13T07:30:00.000Z"),
    amount: "1/2",
    isCompleted: true,
  },
  {
    id: "log4",
    catId: "cat2",
    userId: "user1",
    timestamp: new Date("2025-03-13T18:00:00.000Z"),
    amount: "1",
    notes: "Ate slowly today",
    isCompleted: true,
  },
  {
    id: "log5",
    catId: "cat3",
    userId: "user2",
    timestamp: new Date("2025-03-14T06:00:00.000Z"),
    amount: "1/3",
    isCompleted: true,
  },
  {
    id: "log6",
    catId: "cat3",
    userId: "user1",
    timestamp: new Date("2025-03-13T22:00:00.000Z"),
    amount: "1/3",
    isCompleted: true,
  },
]

export const notifications = [
  {
    id: "notification1",
    userId: "user1",
    timestamp: new Date("2025-03-14T07:30:00.000Z"),
    message: "Reminder: Feed Whiskers",
    isRead: false,
  },
  {
    id: "notification2",
    userId: "user2",
    timestamp: new Date("2025-03-13T19:30:00.000Z"),
    message: "Reminder: Feed Mittens",
    isRead: true,
  },
]

// Remover a implementação duplicada e importar da apiService
import { getNextFeedingTime as getNextFeedingTimeFromApi } from './services/apiService';

// Re-exportar para compatibilidade
export const getNextFeedingTime = getNextFeedingTimeFromApi;

// Buscar todos os gatos
export async function getCats(householdId?: number) {
  try {
    const where = householdId 
      ? { householdId } 
      : {};
    
    const cats = await prisma.cat.findMany({
      where,
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feedingLogs: {
          take: 1,
          orderBy: {
            timestamp: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return cats;
  } catch (error) {
    console.error("Erro ao buscar gatos:", error);
    return [];
  }
}

// Buscar um gato pelo ID
export async function getCatById(id: number) {
  try {
    if (!id) return null;

    const cat = await prisma.cat.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feedingLogs: {
          take: 10,
          orderBy: {
            timestamp: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        schedules: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    return cat;
  } catch (error) {
    console.error("Erro ao buscar gato por ID:", error);
    return null;
  }
}

// Buscar registros de alimentação
export async function getFeedingLogs(catId?: number, limit = 20) {
  try {
    const where = catId 
      ? { catId } 
      : {};
    
    const feedingLogs = await prisma.feedingLog.findMany({
      where,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return feedingLogs;
  } catch (error) {
    console.error("Erro ao buscar registros de alimentação:", error);
    return [];
  }
}

// Buscar agendamentos
export async function getSchedules(catId?: number) {
  try {
    const where = catId 
      ? { catId } 
      : {};
    
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return schedules;
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return [];
  }
}
