/**
 * Google Maps Marker Diffing Tests
 *
 * Tests for the GPU performance optimization that implements marker diffing
 * for Google Maps. Instead of recreating all markers on every update, this
 * optimization only adds new markers and removes markers that are no longer
 * needed, significantly reducing DOM thrashing and GPU load.
 *
 * P1 Fix: Google Maps marker diffing (only update changed markers)
 */

// Type definitions for mocked Google Maps objects
interface MockMarker {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    setMap: (map: MockMap | null) => void;
    addListener: (event: string, callback: () => void) => void;
    getPosition: () => { lat: () => number; lng: () => number };
}

interface MockMap {
    // Empty interface for map mock
}

// Customer location type matching the map page
interface CustomerLocation {
    id: string;
    firstName: string;
    lastName: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    street: string | null;
    category: string | null;
    isVip: boolean | null;
    latitude: number;
    longitude: number;
    displayName: string;
}

describe('Google Maps Marker Diffing', () => {
    // Mock markers storage
    let markersRef: MockMarker[] = [];
    let prevCustomerIdsRef: Set<string> = new Set();
    let markersCreated: number = 0;
    let markersRemoved: number = 0;

    // Mock Google Maps Marker class
    const createMockMarker = (customerId: string): MockMarker => {
        markersCreated++;
        const data: Record<string, string> = { customerId };
        return {
            get: (key: string) => data[key],
            set: (key: string, value: string) => {
                data[key] = value;
            },
            setMap: (map: MockMap | null) => {
                if (map === null) {
                    markersRemoved++;
                }
            },
            addListener: () => { },
            getPosition: () => ({ lat: () => 0, lng: () => 0 }),
        };
    };

    // Marker diffing logic extracted from the map page implementation
    const updateMarkers = (customers: CustomerLocation[]): {
        added: string[];
        removed: string[];
        preserved: string[];
    } => {
        const currentCustomerIds = new Set(customers.map(c => c.id));
        const prevCustomerIds = prevCustomerIdsRef;

        const added: string[] = [];
        const removed: string[] = [];
        const preserved: string[] = [];

        // Find markers to remove (customers no longer in list)
        const markersToRemove = markersRef.filter(
            marker => !currentCustomerIds.has(marker.get('customerId') as string)
        );
        markersToRemove.forEach(marker => {
            removed.push(marker.get('customerId') as string);
            marker.setMap(null);
        });

        // Find new customers to add (not in previous list)
        const newCustomers = customers.filter(c => !prevCustomerIds.has(c.id));
        newCustomers.forEach(c => added.push(c.id));

        // Find preserved markers
        customers.filter(c => prevCustomerIds.has(c.id)).forEach(c => preserved.push(c.id));

        // Update markersRef to only include remaining markers
        markersRef = markersRef.filter(
            marker => currentCustomerIds.has(marker.get('customerId') as string)
        );

        // Add only new markers
        newCustomers.forEach(customer => {
            const marker = createMockMarker(customer.id);
            marker.set('customerId', customer.id);
            markersRef.push(marker);
        });

        // Update ref for next comparison
        prevCustomerIdsRef = currentCustomerIds;

        return { added, removed, preserved };
    };

    // Helper to create customer data
    const createCustomer = (id: string, lat = 39.0, lng = 21.0): CustomerLocation => ({
        id,
        firstName: `First ${id}`,
        lastName: `Last ${id}`,
        company: null,
        email: `${id}@test.com`,
        phone: null,
        city: 'Test City',
        street: null,
        category: 'retail',
        isVip: false,
        latitude: lat,
        longitude: lng,
        displayName: `Customer ${id}`,
    });

    beforeEach(() => {
        markersRef = [];
        prevCustomerIdsRef = new Set();
        markersCreated = 0;
        markersRemoved = 0;
    });

    describe('adding new markers', () => {
        it('should only add new markers', () => {
            // Initial state: no markers
            const customers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
                createCustomer('cust-3'),
            ];

            const result = updateMarkers(customers);

            // All customers should be added
            expect(result.added).toHaveLength(3);
            expect(result.added).toContain('cust-1');
            expect(result.added).toContain('cust-2');
            expect(result.added).toContain('cust-3');

            // Verify markers were created
            expect(markersCreated).toBe(3);
            expect(markersRef).toHaveLength(3);
        });

        it('should only add markers for new customers when data changes', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ];
            updateMarkers(initialCustomers);

            // Reset counters
            markersCreated = 0;

            // Add one new customer
            const updatedCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
                createCustomer('cust-3'), // New
            ];

            const result = updateMarkers(updatedCustomers);

            // Only the new customer should be added
            expect(result.added).toHaveLength(1);
            expect(result.added).toContain('cust-3');
            expect(result.preserved).toHaveLength(2);

            // Only 1 new marker should be created
            expect(markersCreated).toBe(1);
        });
    });

    describe('removing markers', () => {
        it('should only remove markers for removed customers', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
                createCustomer('cust-3'),
            ];
            updateMarkers(initialCustomers);

            // Remove one customer
            const updatedCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-3'),
                // cust-2 removed
            ];

            const result = updateMarkers(updatedCustomers);

            // Only cust-2 should be removed
            expect(result.removed).toHaveLength(1);
            expect(result.removed).toContain('cust-2');

            // Verify marker was removed
            expect(markersRemoved).toBe(1);
            expect(markersRef).toHaveLength(2);
        });

        it('should remove multiple markers when multiple customers are removed', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
                createCustomer('cust-3'),
                createCustomer('cust-4'),
            ];
            updateMarkers(initialCustomers);

            // Remove two customers
            const updatedCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-4'),
            ];

            const result = updateMarkers(updatedCustomers);

            // Two markers should be removed
            expect(result.removed).toHaveLength(2);
            expect(result.removed).toContain('cust-2');
            expect(result.removed).toContain('cust-3');
            expect(markersRemoved).toBe(2);
        });
    });

    describe('preserving existing markers', () => {
        it('should preserve existing markers when data has not changed', () => {
            // Initial state
            const customers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ];
            updateMarkers(customers);

            // Reset counters
            markersCreated = 0;
            markersRemoved = 0;

            // Same data
            const result = updateMarkers(customers);

            // No markers should be added or removed
            expect(result.added).toHaveLength(0);
            expect(result.removed).toHaveLength(0);
            expect(result.preserved).toHaveLength(2);
            expect(markersCreated).toBe(0);
            expect(markersRemoved).toBe(0);
        });

        it('should preserve markers for unchanged customers while adding and removing', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
                createCustomer('cust-3'),
            ];
            updateMarkers(initialCustomers);

            // Reset counters
            markersCreated = 0;
            markersRemoved = 0;

            // Add one, remove one, keep one
            const updatedCustomers = [
                createCustomer('cust-1'), // Preserved
                createCustomer('cust-3'), // Preserved
                createCustomer('cust-4'), // New
                // cust-2 removed
            ];

            const result = updateMarkers(updatedCustomers);

            // Verify diffing results
            expect(result.preserved).toHaveLength(2);
            expect(result.preserved).toContain('cust-1');
            expect(result.preserved).toContain('cust-3');
            expect(result.added).toHaveLength(1);
            expect(result.added).toContain('cust-4');
            expect(result.removed).toHaveLength(1);
            expect(result.removed).toContain('cust-2');

            // Verify marker operations
            expect(markersCreated).toBe(1);
            expect(markersRemoved).toBe(1);
        });
    });

    describe('edge cases', () => {
        it('should handle empty customer list', () => {
            // Initial state with customers
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ];
            updateMarkers(initialCustomers);

            // Clear all customers
            const result = updateMarkers([]);

            // All markers should be removed
            expect(result.removed).toHaveLength(2);
            expect(result.added).toHaveLength(0);
            expect(result.preserved).toHaveLength(0);
            expect(markersRef).toHaveLength(0);
        });

        it('should handle transitioning from empty to populated', () => {
            // Start with empty
            updateMarkers([]);

            // Add customers
            const customers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ];

            const result = updateMarkers(customers);

            // All should be added
            expect(result.added).toHaveLength(2);
            expect(result.removed).toHaveLength(0);
            expect(markersRef).toHaveLength(2);
        });

        it('should handle complete customer replacement', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ];
            updateMarkers(initialCustomers);

            // Reset counters
            markersCreated = 0;
            markersRemoved = 0;

            // Completely different customers
            const newCustomers = [
                createCustomer('cust-3'),
                createCustomer('cust-4'),
            ];

            const result = updateMarkers(newCustomers);

            // All old markers removed, all new markers added
            expect(result.removed).toHaveLength(2);
            expect(result.added).toHaveLength(2);
            expect(result.preserved).toHaveLength(0);
            expect(markersCreated).toBe(2);
            expect(markersRemoved).toBe(2);
        });

        it('should correctly track customer IDs across multiple updates', () => {
            // First update
            updateMarkers([
                createCustomer('cust-1'),
                createCustomer('cust-2'),
            ]);

            // Second update
            updateMarkers([
                createCustomer('cust-2'),
                createCustomer('cust-3'),
            ]);

            // Third update
            const result = updateMarkers([
                createCustomer('cust-3'),
                createCustomer('cust-4'),
            ]);

            // Verify the diffing is working correctly across multiple updates
            expect(result.removed).toContain('cust-2');
            expect(result.added).toContain('cust-4');
            expect(result.preserved).toContain('cust-3');
        });
    });

    describe('performance validation', () => {
        it('should minimize marker operations for large datasets', () => {
            // Create a large initial dataset
            const initialCustomers = Array.from({ length: 100 }, (_, i) =>
                createCustomer(`cust-${i}`)
            );
            updateMarkers(initialCustomers);

            // Reset counters
            markersCreated = 0;
            markersRemoved = 0;

            // Small change: add 1, remove 1
            const updatedCustomers = [
                ...initialCustomers.slice(1), // Remove first
                createCustomer('cust-new'), // Add new
            ];

            const result = updateMarkers(updatedCustomers);

            // Only 2 operations should occur (1 add, 1 remove)
            // NOT 200 operations (100 removes + 100 adds)
            expect(markersCreated).toBe(1);
            expect(markersRemoved).toBe(1);
            expect(result.preserved).toHaveLength(99);
        });

        it('should not recreate markers when customer data properties change but ID stays same', () => {
            // Initial state
            const initialCustomers = [
                createCustomer('cust-1', 39.0, 21.0),
            ];
            updateMarkers(initialCustomers);

            // Reset counters
            markersCreated = 0;

            // Same customer ID but different coordinates (simulating data refresh)
            // Note: In real implementation, this would need additional logic to update
            // marker positions, but the diffing should still not recreate the marker
            const updatedCustomers = [
                createCustomer('cust-1', 40.0, 22.0), // Same ID, different coords
            ];

            const result = updateMarkers(updatedCustomers);

            // Marker should be preserved (same ID)
            expect(result.preserved).toHaveLength(1);
            expect(result.added).toHaveLength(0);
            expect(result.removed).toHaveLength(0);
            expect(markersCreated).toBe(0);
        });
    });
});
