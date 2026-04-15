import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "cardbowl_offline_queue";
const MAX_RETRIES = 5;

export type QueueActionType =
  | "card_create"
  | "card_update"
  | "card_delete"
  | "profile_update";

export interface QueueItem {
  id: string;
  type: QueueActionType;
  payload: any;
  timestamp: string;
  retryCount: number;
}

// --- Queue CRUD ---

export async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(
  type: QueueActionType,
  payload: any
): Promise<void> {
  const queue = await getQueue();

  // Deduplicate: if same type + same entity id, replace the old entry
  const entityId = payload?.id ?? payload?.uniqueKey ?? "";
  const idx = queue.findIndex(
    (q) => q.type === type && (q.payload?.id === entityId || q.payload?.uniqueKey === entityId)
  );

  const item: QueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  if (idx >= 0) {
    queue[idx] = item; // Replace stale entry
  } else {
    queue.push(item);
  }

  await saveQueue(queue);
  console.log(`[Queue] Enqueued ${type}, queue size: ${queue.length}`);
}

export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter((q) => q.id !== id));
}

export async function incrementRetry(id: string): Promise<boolean> {
  const queue = await getQueue();
  const item = queue.find((q) => q.id === id);
  if (!item) return false;

  item.retryCount += 1;
  if (item.retryCount >= MAX_RETRIES) {
    // Drop permanently failed items
    console.warn(`[Queue] Dropping ${item.type} after ${MAX_RETRIES} retries`, item.payload?.id);
    await saveQueue(queue.filter((q) => q.id !== id));
    return false;
  }

  await saveQueue(queue);
  return true;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
