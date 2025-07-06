

<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import { theme } from '$lib/stores/theme';
  
  let selectedDate = new Date().toISOString().split('T')[0];
  let selectedSpace;
  let selectedShift = '8:00-14:00';
  let parkingSpaces = [];
  let loading = false;
  let error = null;

  const SHIFT_TYPES = {
    '8:00-14:00': 'Morning shift (8:00-14:00)',
    '14:00-21:00': 'Afternoon shift (14:00-21:00)',
    '9:30-18:30': 'Full day shift (9:30-18:30)'
  };

onMount(() => {
  loadParkingAvailability();

  // Watch for shift/date changes *on client only*
  $: selectedDate, selectedShift;
  loadParkingAvailability();
});


  async function loadParkingAvailability() {
    if (!selectedDate) return;
    
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/parking/dashboard?date=${selectedDate}`);
      const data = await response.json();

      if (data.success) {
        parkingSpaces = data.spaces;
      } else {
        error = data.error || 'Failed to load parking availability';
      }
    } catch (err) {
      error = 'Failed to connect to server';
      console.error('Error loading parking availability:', err);
    } finally {
      loading = false;
    }
  }

  function getSpaceAvailability(space) {
    const shift = selectedShift;
    
    if (shift === '9:30-18:30') {
      return space.isAvailable?.fullDay;
    } else if (shift === '8:00-14:00') {
      return space.isAvailable?.morning;
    } else if (shift === '14:00-21:00') {
      return space.isAvailable?.afternoon;
    }
    
    return false;
  }

  function getSpaceStatus(space) {
    const isAvailable = getSpaceAvailability(space);
    const relevantReservations = space.reservations?.filter(r => {
      if (selectedShift === '9:30-18:30') {
        return r.shiftType === 'FULL_DAY';
      } else if (selectedShift === '8:00-14:00') {
        return r.shiftType === 'MORNING' || r.shiftType === 'FULL_DAY';
      } else if (selectedShift === '14:00-21:00') {
        return r.shiftType === 'AFTERNOON' || r.shiftType === 'FULL_DAY';
      }
      return false;
    }) || [];

    return {
      isAvailable,
      reservedBy: relevantReservations[0]?.user || null,
      reservationCount: relevantReservations.length
    };
  }

  function selectSpace(spaceNumber) {
    selectedSpace = spaceNumber;
  }

  function reserve() {
    if (!selectedSpace) {
      alert('Please select a parking space first');
      return;
    }
    goto(`/reserve?space=${selectedSpace}&date=${selectedDate}&shift=${encodeURIComponent(selectedShift)}`);
  }

  // Reactive statement to reload data when date or shift changes
  $: if (selectedDate || selectedShift) {
    loadParkingAvailability();
  }
</script>

<Header />
<div class="hero-container" class:dark={$theme === 'dark'}>
  <div class="scalable-wrapper">
    <div class="controls-panel" class:dark={$theme === 'dark'}>
      <div class="date-picker">
        <label for="date-input">Select Date:</label>
        <input 
          id="date-input"
          type="date" 
          bind:value={selectedDate}
          class="date-input"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      <div class="shift-selector">
        <label for="shift-select">Select Shift:</label>
        <select id="shift-select" bind:value={selectedShift}>
          <option value="8:00-14:00">Morning shift (8:00-14:00)</option>
          <option value="14:00-21:00">Afternoon shift (14:00-21:00)</option>
          <option value="9:30-18:30">Full day shift (9:30-18:30)</option>
        </select>
      </div>
      <div class="space-selector">
        <label for="space-input">Selected Space:</label>
        <input 
          id="space-input"
          type="text" 
          bind:value={selectedSpace}
          placeholder="Click on a space"
          readonly
          class="space-input"
        />
      </div>
      <button on:click={reserve} disabled={!selectedSpace} class="reserve-btn">
        Reserve Space {selectedSpace || ''}
      </button>
    </div>

    <div class="parking-lot-container">
      <img
        src="/empty-parking-lot.png"
        alt="Empty parking lot"
        class="scalable-image"
        loading="eager"
      />
      
      {#if loading}
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>Loading parking availability...</p>
        </div>
      {:else if error}
        <div class="error-overlay">
          <p class="error-message">{error}</p>
          <button on:click={loadParkingAvailability} class="retry-btn">Retry</button>
        </div>
      {:else}
        <div class="scalable-buttons">
          <div class="button-columns">
            <div class="left-column">
              {#each parkingSpaces.slice(0, 10) as space (space.id)}
                {@const status = getSpaceStatus(space)}
                <button 
                  class="scalable-button"
                  class:available={status.isAvailable}
                  class:occupied={!status.isAvailable}
                  class:selected={selectedSpace === space.spaceNumber}
                  on:click={() => selectSpace(space.spaceNumber)}
                  disabled={!status.isAvailable}
                  title={status.isAvailable 
                    ? `Space ${space.spaceNumber} - Available` 
                    : `Space ${space.spaceNumber} - Reserved${status.reservedBy ? ` by ${status.reservedBy.firstName} ${status.reservedBy.lastName}` : ''}`
                  }
                >
                  <span class="space-number">{space.spaceNumber}</span>
                  {#if status.reservedBy}
                    <span class="reserved-by">{status.reservedBy.firstName?.[0]}{status.reservedBy.lastName?.[0]}</span>
                  {/if}
                </button>
              {/each}
            </div>
            <div class="right-column">
              {#each parkingSpaces.slice(10, 20) as space (space.id)}
                {@const status = getSpaceStatus(space)}
                <button 
                  class="scalable-button"
                  class:available={status.isAvailable}
                  class:occupied={!status.isAvailable}
                  class:selected={selectedSpace === space.spaceNumber}
                  on:click={() => selectSpace(space.spaceNumber)}
                  disabled={!status.isAvailable}
                  title={status.isAvailable 
                    ? `Space ${space.spaceNumber} - Available` 
                    : `Space ${space.spaceNumber} - Reserved${status.reservedBy ? ` by ${status.reservedBy.firstName} ${status.reservedBy.lastName}` : ''}`
                  }
                >
                  <span class="space-number">{space.spaceNumber}</span>
                  {#if status.reservedBy}
                    <span class="reserved-by">{status.reservedBy.firstName?.[0]}{status.reservedBy.lastName?.[0]}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="legend" class:dark={$theme === 'dark'}>
      <div class="legend-item">
        <div class="legend-color available"></div>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <div class="legend-color occupied"></div>
        <span>Occupied</span>
      </div>
      <div class="legend-item">
        <div class="legend-color selected"></div>
        <span>Selected</span>
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f5f9ff;
    color: #2c3e50;
    font-family: "Poppins", sans-serif;
  }

  .hero-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    background: #f5f9ff;
    overflow: hidden;
    transition: background 0.3s ease;
    padding: 20px 0;
  }

  .hero-container.dark {
    background: #0a192f;
    color: #e6f1ff;
  }

  .scalable-wrapper {
    position: relative;
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .controls-panel {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 1rem;
    align-items: end;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background 0.3s ease, box-shadow 0.3s ease;
  }

  .controls-panel.dark {
    background: #1a202c;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .controls-panel label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .date-input, .space-input, select {
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    background: white;
    font-size: 1rem;
    transition: border-color 0.3s ease;
  }

  .hero-container.dark .date-input,
  .hero-container.dark .space-input,
  .hero-container.dark select {
    background: #2d3748;
    border-color: #4a5568;
    color: #e6f1ff;
  }

  .date-input:focus,
  .space-input:focus,
  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .space-input {
    cursor: pointer;
  }

  .reserve-btn {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s ease, transform 0.2s ease;
    white-space: nowrap;
  }

  .reserve-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-2px);
  }

  .reserve-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .parking-lot-container {
    position: relative;
    width: 100%;
    margin-bottom: 2rem;
  }

  .scalable-image {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  }

  .loading-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 12px;
    backdrop-filter: blur(8px);
  }

  .hero-container.dark .loading-overlay,
  .hero-container.dark .error-overlay {
    background: rgba(10, 25, 47, 0.95);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
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
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .retry-btn:hover {
    background: #2563eb;
  }

  .scalable-buttons {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    height: 65%;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  }

  .button-columns {
    display: flex;
    width: 70%;
    height: 100%;
    pointer-events: auto;
    position: relative;
  }

  .left-column {
    position: absolute;
    left: 15%;
    width: 30%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0;
  }

  .right-column {
    position: absolute;
    left: 55%;
    width: 30%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0;
  }

  .scalable-button {
    width: 100%;
    height: 10%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.9rem;
    margin: 1px 0;
  }

  .scalable-button:hover {
    color: #0a192f;
  }

  .scalable-button.available {
    background: rgba(34, 197, 94, 0.8);
    color: white;
    border-color: #22c55e;
  }

  .scalable-button.available:hover {
    background: rgba(34, 197, 94, 0.9);
    transform: scale(1.05);
  }

  .scalable-button.occupied {
    background: rgba(239, 68, 68, 0.8);
    color: white;
    border-color: #ef4444;
    cursor: not-allowed;
  }

  .scalable-button.selected {
    background: rgba(59, 130, 246, 0.9);
    border-color: #3b82f6;
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .space-number {
    font-size: 1rem;
    font-weight: 700;
  }

  .reserved-by {
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.7rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 3px;
    border-radius: 3px;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-top: 1rem;
  }

  .legend.dark {
    background: #1a202c;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid transparent;
  }

  .legend-color.available {
    background: rgba(34, 197, 94, 0.8);
    border-color: #22c55e;
  }

  .legend-color.occupied {
    background: rgba(239, 68, 68, 0.8);
    border-color: #ef4444;
  }

  .legend-color.selected {
    background: rgba(59, 130, 246, 0.9);
    border-color: #3b82f6;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .controls-panel {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .scalable-wrapper {
      width: 95%;
    }
    
    .scalable-buttons {
      width: 55%;
      height: 70%;
    }
    
    .button-columns {
      width: 80%;
    }
    
    .left-column {
      left: 13%;
      width: 32%;
    }
    
    .right-column {
      left: 57%;
      width: 32%;
    }
    
    .scalable-button {
      height: 9%;
    }

    .legend {
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .scalable-wrapper {
      width: 100%;
    }
    
    .button-columns {
      width: 70%;
      height: 84%;
    }
    
    .left-column {
      left: 11%;
      width: 34%;
    }
    
    .right-column {
      left: 59%;
      width: 34%;
    }
    
    .scalable-button {
      height: 10%;
    }

    .legend {
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
  }
</style>