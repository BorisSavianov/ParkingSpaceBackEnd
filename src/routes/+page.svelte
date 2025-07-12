<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import { theme } from '$lib/stores/theme';
  
  let selectedStartDate = new Date().toISOString().split('T')[0];
  let selectedEndDate = new Date().toISOString().split('T')[0];
  let selectedSpace = null;
  let selectedShift = 'full';
  let parkingSpaces = [];
  let loading = false;
  let error = null;
  let dateRangeData = new Map(); // Store availability for each date

  const SHIFT_TYPES = {
    'morning': { name: 'Morning', time: '8:00 AM - 2:00 PM', api: '8:00-14:00' },
    'afternoon': { name: 'Afternoon', time: '2:00 PM - 9:00 PM', api: '14:00-21:00' },
    'full': { name: 'Full Day', time: '9:30 AM - 6:30 PM', api: '9:30-18:30' }
  };

  onMount(() => {
    loadParkingAvailability();
  });

  $: if (selectedStartDate || selectedEndDate || selectedShift) {
    loadParkingAvailability();
    selectedSpace = null; // Reset selection when date/shift changes
  }

  // Generate array of dates between start and end date
  function getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  async function loadParkingAvailability() {
    if (!selectedStartDate || !selectedEndDate) return;
    
    // Validate date range
    if (new Date(selectedStartDate) > new Date(selectedEndDate)) {
      error = 'Start date must be before or equal to end date';
      return;
    }
    
    loading = true;
    error = null;
    dateRangeData.clear();

    try {
      const dateRange = getDateRange(selectedStartDate, selectedEndDate);
      
      // Fetch availability for each date in the range
      const fetchPromises = dateRange.map(async (date) => {
        try {
          const response = await fetch(`/api/parking/dashboard?date=${date}`);
          const data = await response.json();
          
          if (data.success) {
            dateRangeData.set(date, data.spaces);
          } else {
            throw new Error(data.error || `Failed to load data for ${date}`);
          }
        } catch (err) {
          console.error(`Error loading data for ${date}:`, err);
          throw err;
        }
      });

      await Promise.all(fetchPromises);
      
      // Combine availability across all dates
      parkingSpaces = combineAvailabilityData();
      
    } catch (err) {
      error = 'Failed to load parking availability for date range';
      console.error('Error loading parking availability:', err);
    } finally {
      loading = false;
    }
  }

  function combineAvailabilityData() {
    if (dateRangeData.size === 0) return [];
    
    // Get the first date's spaces as a template
    const firstDateSpaces = Array.from(dateRangeData.values())[0];
    
    return firstDateSpaces.map(spaceTemplate => {
      const spaceNumber = spaceTemplate.spaceNumber;
      
      // For each space, check availability across all dates
      const combinedAvailability = {
        fullDay: true,
        morning: true,
        afternoon: true
      };
      
      const allReservations = [];
      
      // Check each date for this space
      for (const [date, spaces] of dateRangeData) {
        const spaceForDate = spaces.find(s => s.spaceNumber === spaceNumber);
        
        if (spaceForDate) {
          // Space is only available for the range if it's available on ALL dates
          combinedAvailability.fullDay = combinedAvailability.fullDay && spaceForDate.isAvailable?.fullDay;
          combinedAvailability.morning = combinedAvailability.morning && spaceForDate.isAvailable?.morning;
          combinedAvailability.afternoon = combinedAvailability.afternoon && spaceForDate.isAvailable?.afternoon;
          
          // Collect all reservations with date context
          if (spaceForDate.reservations) {
            spaceForDate.reservations.forEach(reservation => {
              allReservations.push({
                ...reservation,
                date: date,
                dateFormatted: formatDate(date)
              });
            });
          }
        } else {
          // If space data is missing for any date, mark as unavailable
          combinedAvailability.fullDay = false;
          combinedAvailability.morning = false;
          combinedAvailability.afternoon = false;
        }
      }
      
      return {
        ...spaceTemplate,
        isAvailable: combinedAvailability,
        reservations: allReservations,
        dateRange: {
          start: selectedStartDate,
          end: selectedEndDate,
          totalDays: dateRangeData.size
        }
      };
    });
  }

  function getSpaceAvailability(space) {
    const apiShift = SHIFT_TYPES[selectedShift].api;
    
    if (apiShift === '9:30-18:30') {
      return space.isAvailable?.fullDay;
    } else if (apiShift === '8:00-14:00') {
      return space.isAvailable?.morning;
    } else if (apiShift === '14:00-21:00') {
      return space.isAvailable?.afternoon;
    }
    
    return false;
  }

  function getSpaceStatus(space) {
    const isAvailable = getSpaceAvailability(space);
    const apiShift = SHIFT_TYPES[selectedShift].api;
    
    const relevantReservations = space.reservations?.filter(r => {
      if (apiShift === '9:30-18:30') {
        return r.shiftType === 'FULL_DAY';
      } else if (apiShift === '8:00-14:00') {
        return r.shiftType === 'MORNING' || r.shiftType === 'FULL_DAY';
      } else if (apiShift === '14:00-21:00') {
        return r.shiftType === 'AFTERNOON' || r.shiftType === 'FULL_DAY';
      }
      return false;
    }) || [];

    return {
      isAvailable,
      reservedBy: relevantReservations[0]?.user || null,
      reservationCount: relevantReservations.length,
      conflictingDates: relevantReservations.map(r => r.dateFormatted || r.date).join(', ')
    };
  }

  function selectSpace(spaceNumber) {
    if (selectedSpace === spaceNumber.toString()) {
      selectedSpace = null;
    } else {
      selectedSpace = spaceNumber.toString();
    }
  }

  function reserveSpace() {
    if (!selectedSpace) {
      alert('Please select a parking space first');
      return;
    }
    
    const apiShift = SHIFT_TYPES[selectedShift].api;
    // For date ranges, we'll pass both start and end dates
    goto(`/reserve?space=${selectedSpace}&startDate=${selectedStartDate}&endDate=${selectedEndDate}&shift=${encodeURIComponent(apiShift)}`);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-UK', options);
  }

  function formatDateRange() {
    if (selectedStartDate === selectedEndDate) {
      return formatDate(selectedStartDate);
    }
    return `${formatDate(selectedStartDate)} - ${formatDate(selectedEndDate)}`;
  }

  function getAvailableCount() {
    return parkingSpaces.filter(space => getSpaceAvailability(space)).length;
  }

  function getOccupiedCount() {
    return parkingSpaces.filter(space => !getSpaceAvailability(space)).length;
  }

  function getDayCount() {
    const start = new Date(selectedStartDate);
    const end = new Date(selectedEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  
  $: formattedDateRange = selectedStartDate === selectedEndDate
    ? formatDate(selectedStartDate)
    : `${formatDate(selectedStartDate)} - ${formatDate(selectedEndDate)}`;
</script>

<svelte:head>
  <title>Main - ReserveParkingSpace</title>
</svelte:head>

<Header redirect={true} />

<div class="page-container" class:dark={$theme === 'dark'}>
  <!-- Main Content -->
  <div class="main-content">
    <!-- Controls Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Select Your Preferences</h2>
        <p class="card-subtitle">Choose date range and shift for parking availability</p>
      </div>
      <div class="card-content">
        <div class="controls-grid">
          <!-- Shift Selector -->
          <div class="shift-selector">
            <label class="shift-label">Choose a shift:</label>
            <div class="shift-options">
              {#each Object.entries(SHIFT_TYPES) as [key, shift]}
                <button 
                  class="shift-option"
                  class:selected={selectedShift === key}
                  on:click={() => selectedShift = key}
                >
                  <div class="shift-name">{shift.name}</div>
                  <div class="shift-time">{shift.time}</div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Date Range Selector -->
          <div class="date-range-selector">
            <label class="shift-label">Choose date range:</label>
            <div class="date-inputs">
              <div class="date-input-group">
                <label class="date-label">From:</label>
                <input 
                  type="date" 
                  bind:value={selectedStartDate}
                  min={new Date().toISOString().split('T')[0]}
                  class="date-input"
                />
              </div>
              <div class="date-input-group">
                <label class="date-label">To:</label>
                <input 
                  type="date" 
                  bind:value={selectedEndDate}
                  min={selectedStartDate}
                  class="date-input"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Map Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Parking Lot Map</h2>
        <p class="card-subtitle">
          Showing availability for {formattedDateRange}
          {#if getDayCount() > 1}
            <br><small>Spaces shown as available are free for ALL selected dates</small>
          {/if}
        </p>
      </div>
      <div class="card-content">
        <div class="parking-map">
          <!-- Legend -->
          <div class="map-legend">
            <div class="legend-item">
              <div class="legend-color available"></div>
              <span class="legend-text">Available (all dates)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color occupied"></div>
              <span class="legend-text">Occupied (any date)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color selected"></div>
              <span class="legend-text">Selected</span>
            </div>
          </div>

          <!-- Loading/Error States -->
          {#if loading}
            <div class="status-overlay">
              <div class="spinner"></div>
              <p>Loading parking availability for {getDayCount()} day{getDayCount() > 1 ? 's' : ''}...</p>
            </div>
          {:else if error}
            <div class="status-overlay">
              <p class="error-message">{error}</p>
              <button on:click={loadParkingAvailability} class="retry-btn">Retry</button>
            </div>
          {:else}
            <!-- Parking Layout -->
            <div class="parking-layout">
              <div class="parking-divider"></div>
              
              <!-- Left Side (Spaces 11-20) -->
              <div class="parking-side parking-left">
                {#each parkingSpaces.filter(space => space.spaceNumber >= 11 && space.spaceNumber <= 20).reverse() as space}
                  {@const status = getSpaceStatus(space)}
                  <button
                    class="parking-space"
                    class:available={status.isAvailable}
                    class:occupied={!status.isAvailable}
                    class:selected={selectedSpace === space.spaceNumber.toString()}
                    on:click={() => selectSpace(space.spaceNumber)}
                    disabled={!status.isAvailable}
                    title={status.isAvailable 
                      ? `Space ${space.spaceNumber} - Available for all selected dates` 
                      : `Space ${space.spaceNumber} - Occupied on: ${status.conflictingDates || 'some dates'}`
                    }
                  >
                    {space.spaceNumber}
                    {#if !status.isAvailable}
                      <div class="occupied-overlay"></div>
                    {/if}
                  </button>
                {/each}
              </div>

              <!-- Right Side (Spaces 1-10) -->
              <div class="parking-side parking-right">
                {#each parkingSpaces.filter(space => space.spaceNumber >= 1 && space.spaceNumber <= 10).reverse() as space}
                  {@const status = getSpaceStatus(space)}
                  <button
                    class="parking-space"
                    class:available={status.isAvailable}
                    class:occupied={!status.isAvailable}
                    class:selected={selectedSpace === space.spaceNumber.toString()}
                    on:click={() => selectSpace(space.spaceNumber)}
                    disabled={!status.isAvailable}
                    title={status.isAvailable 
                      ? `Space ${space.spaceNumber} - Available for all selected dates` 
                      : `Space ${space.spaceNumber} - Occupied on: ${status.conflictingDates || 'some dates'}`
                    }
                  >
                    {space.spaceNumber}
                    {#if !status.isAvailable}
                      <div class="occupied-overlay"></div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Stats -->
            <div class="map-stats">
              <span>Available: <span class="stat-count">{getAvailableCount()}</span></span>
              <span>Occupied: <span class="stat-count">{getOccupiedCount()}</span></span>
              <span>Total: {parkingSpaces.length}</span>
              {#if getDayCount() > 1}
                <span class="range-info">({getDayCount()} days)</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Reserve Button -->
    {#if selectedSpace}
      <div class="reserve-section">
        <div class="card reserve-card">
          <div class="reserve-content">
            <p class="reserve-title">
              Space {selectedSpace} selected for {SHIFT_TYPES[selectedShift].name.toLowerCase()} shift
            </p>
            <p class="reserve-date">{formatDateRange()}</p>
            {#if getDayCount() > 1}
              <p class="reserve-duration">Duration: {getDayCount()} consecutive days</p>
            {/if}
            <button class="reserve-button" on:click={reserveSpace}>
              Reserve This Space
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .date-range-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .date-inputs {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .date-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .date-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .date-range-info {
    margin-top: 0.5rem;
  }
  
  .range-days {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .range-info {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-left: 0.5rem;
  }
  
  .reserve-duration {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.5rem 0;
  }
  
  @media (max-width: 640px) {
    .date-inputs {
      flex-direction: column;
    }
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .page-container {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    min-height: 100vh;
    transition: background 0.3s ease;
  }

  .page-container.dark {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  /* Header */
  .header {
    background: linear-gradient(90deg, #2563eb 0%, #4338ca 100%);
    color: white;
    padding: 1.5rem 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .header-title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .header-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .header-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Main Content */
  .main-content {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Card */
  .card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: background 0.3s ease;
  }

  .page-container.dark .card {
    background: #1e293b;
  }

  .card-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .page-container.dark .card-header {
    border-bottom-color: #334155;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .page-container.dark .card-title {
    color: #e2e8f0;
  }

  .card-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .page-container.dark .card-subtitle {
    color: #94a3b8;
  }

  .card-content {
    padding: 1.5rem;
  }

  /* Controls Grid */
  .controls-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .controls-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* Shift Selector */
  .shift-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .shift-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .page-container.dark .shift-label {
    color: #e2e8f0;
  }

  .shift-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shift-option {
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .page-container.dark .shift-option {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
  }

  .shift-option:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .shift-option.selected {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1e40af;
  }

  .page-container.dark .shift-option.selected {
    background: #1e40af;
    color: white;
  }

  .shift-name {
    font-weight: 500;
  }

  .shift-time {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .page-container.dark .shift-time {
    color: #94a3b8;
  }

  .shift-option.selected .shift-time {
    color: #6b7280;
  }

  .page-container.dark .shift-option.selected .shift-time {
    color: #e2e8f0;
  }

  /* Date Selector */
  .date-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .date-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    color: #1f2937;
  }

  .page-container.dark .date-input {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
  }

  .date-input:hover {
    border-color: #d1d5db;
  }

  .date-input:focus {
    border-color: #3b82f6;
    outline: none;
  }

  /* Parking Map */
  .parking-map {
    background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
    position: relative;
    min-height: 650px;
  }

  .map-legend {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 1rem;
    height: 0.75rem;
    border-radius: 0.25rem;
    border: 1px solid;
  }

  .legend-color.available {
    background: #dcfce7;
    border-color: #86efac;
  }

  .legend-color.occupied {
    background: #fecaca;
    border-color: #fca5a5;
  }

  .legend-color.selected {
    background: #3b82f6;
    border-color: #2563eb;
  }

  .legend-text {
    font-size: 0.75rem;
    color: #e5e7eb;
  }

  /* Status Overlay */
  .status-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #e5e7eb;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #6b7280;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    color: #ef4444;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .retry-btn {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .retry-btn:hover {
    background: #2563eb;
  }

  /* Parking Layout */
  .parking-layout {
    position: relative;
    min-height: 600px;
  }

  .parking-divider {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2rem;
    background: linear-gradient(180deg, #10b981 0%, #059669 100%);
    transform: translateX(-50%);
    border-radius: 9999px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .parking-side {
    width: calc(50% - 2rem);
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .parking-left {
    float: left;
    place-items: end;
  }

  .parking-right {
    float: right;
  }

  .parking-space {
    position: relative;
    width: 4rem;
    height: 3rem;
    border: 2px solid;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 500;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    background: transparent;
  }

  .parking-space.available {
    background: #dcfce7;
    border-color: #86efac;
    color: #065f46;
  }

  .parking-space.available:hover {
    background: #bbf7d0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .parking-space.occupied {
    background: #fecaca;
    border-color: #fca5a5;
    cursor: not-allowed;
    color: #991b1b;
  }

  .parking-space.selected {
    background: #3b82f6;
    border-color: #2563eb;
    color: white;
    transform: scale(1.05);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .occupied-overlay {
    position: absolute;
    inset: 0;
    background: rgba(248, 113, 113, 0.5);
    border-radius: 0.5rem;
  }

  /* Map Stats */
  .map-stats {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #6b7280;
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #d1d5db;
  }

  .stat-count {
    font-weight: 600;
  }

  /* Reserve Section */
  .reserve-section {
    animation: fadeIn 0.3s ease-out;
  }

  .reserve-card {
    background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #86efac;
  }

  .page-container.dark .reserve-card {
    background: linear-gradient(90deg, #064e3b 0%, #065f46 100%);
    border-color: #059669;
  }

  .reserve-content {
    text-align: center;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reserve-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: #1f2937;
  }

  .page-container.dark .reserve-title {
    color: #e2e8f0;
  }

  .reserve-date {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .page-container.dark .reserve-date {
    color: #94a3b8;
  }

  .reserve-button {
    background: linear-gradient(90deg, #059669 0%, #047857 100%);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 9999px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .reserve-button:hover {
    background: linear-gradient(90deg, #047857 0%, #065f46 100%);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
    }
    
    .parking-side {
      width: calc(50% - 1rem);
    }
    
    .parking-divider {
      width: 1rem;
    }
    
    .parking-space {
      width: 3rem;
      height: 2.5rem;
      font-size: 0.7rem;
    }
    
    .map-legend {
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .parking-space {
      width: 2.5rem;
      height: 2rem;
      font-size: 0.6rem;
    }
    
    .map-legend {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
</style>