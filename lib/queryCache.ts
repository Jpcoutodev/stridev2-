// Simple in-memory cache with TTL for reducing redundant API calls
// Use for data that changes infrequently like user profiles and stats

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

class QueryCache {
    private cache = new Map<string, CacheItem<any>>();
    private defaultTTL = 60000; // 1 minute

    // Get cached data if valid, otherwise return null
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.defaultTTL) {
            this.cache.delete(key);
            return null;
        }

        return item.data as T;
    }

    // Set data with optional custom TTL
    set<T>(key: string, data: T, ttl?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Auto-expire after TTL
        if (ttl || this.defaultTTL) {
            setTimeout(() => {
                this.cache.delete(key);
            }, ttl || this.defaultTTL);
        }
    }

    // Invalidate specific cache entry
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    // Invalidate all entries matching a pattern
    invalidatePattern(pattern: string): void {
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        });
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const queryCache = new QueryCache();

// Cache keys factory
export const CacheKeys = {
    userStats: (userId: string) => `user_stats_${userId}`,
    userProfile: (userId: string) => `user_profile_${userId}`,
    followStatus: (followerId: string, followingId: string) => `follow_${followerId}_${followingId}`,
};
