<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/Header.svelte';

  $: space = $page.url.searchParams.get('space');

  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  let daysInMonth = [];
  let startingDay = 0;
  let selectedStartDate = null;
  let selectedEndDate = null;
  let today = new Date().toDateString();
  let showModal = false;
  let savedRanges = [];
  let selectedRangeType = null;
  let isLoading = false;
  let error = null;
  let uploadedFile = null;
  let fileInput = null;

  const rangeTypes = [
    { id: 1, name: "Morning shift (8:00-14:00)", value: "8:00-14:00", color: "#4CAF50"},
    { id: 2, name: "Evening shift (14:00-21:00)", value: "14:00-21:00", color: "#2196F3"},
    { id: 3, name: "All day shift (9:30-18:30)", value: "9:30-18:30", color: "#9C27B0"}
  ];

  // Get authentication token
  function getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Update calendar when month/year changes
  function updateCalendar() {
    startingDay = new Date(currentYear, currentMonth, 1).getDay();
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    daysInMonth = Array.from({ length: days }, (_, i) => i + 1);
  }

  // Navigation functions
  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    updateCalendar();
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    updateCalendar();
  }

  function handleDateClick(day) {
    const clickedDate = new Date(currentYear, currentMonth, day);
   
    
    // Don't allow selecting past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) {
      return;
    }
    
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      selectedStartDate = clickedDate;
      selectedEndDate = null;
    } else {
      if (clickedDate >= selectedStartDate) {
        selectedEndDate = clickedDate;
      } else {
        selectedEndDate = selectedStartDate;
        selectedStartDate = clickedDate;
      }
      showModal = true;
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        error = 'Only PDF files are allowed';
        return;
      }
      
      // Validate file size (2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        error = 'File size must be less than 2MB';
        return;
      }
      
      uploadedFile = file;
      error = null;
    }
  }

  function clearFile() {
    uploadedFile = null;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function getDaysDifference(startDate, endDate) {
  // Parse the YYYY-MM-DD format strings
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

  async function makeReservation() {
  if (!selectedStartDate || !selectedEndDate || !selectedRangeType) {
    error = 'Please select dates and shift type';
    return;
  }

  const token = getAuthToken();
  if (!token) {
    error = 'Please log in to make a reservation';
    return;
  }

  isLoading = true;
  error = null;

  try {
    // Fix: Use local date formatting instead of toISOString() to avoid timezone issues
    const startDate = formatDateForAPI(selectedStartDate);
    const endDate = formatDateForAPI(selectedEndDate);
    const daysDiff = getDaysDifference(startDate, endDate);

    // Check if document is required for reservations longer than 2 days
    if (daysDiff > 2 && !uploadedFile) {
      error = 'Schedule document (PDF) is required for reservations longer than 2 days';
      isLoading = false;
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('spaceId', space);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('shiftType', selectedRangeType.value);
    
    if (uploadedFile) {
      formData.append('scheduleDocument', uploadedFile);
    }

    const response = await fetch('/api/parking/reservations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      // Add to saved ranges for visual display
      savedRanges.push({
        id: result.reservation.id,
        startTimestamp: selectedStartDate.getTime(),
        endTimestamp: selectedEndDate.getTime(),
        color: selectedRangeType.color,
        name: selectedRangeType.name,
        shiftType: selectedRangeType.value,
        icon: getShiftIcon(selectedRangeType.value)
      });
      
      // Save to memory (not localStorage since it's not supported)
      savedRanges = [...savedRanges];
      
      // Close modal and reset
      showModal = false;
      selectedStartDate = null;
      selectedEndDate = null;
      selectedRangeType = null;
      uploadedFile = null;
      if (fileInput) fileInput.value = '';
      
      alert('Reservation created successfully!');
    } else {
      error = result.error || 'Failed to create reservation';
    }
  } catch (err) {
    console.error('Reservation error:', err);
    error = 'Network error. Please try again.';
  } finally {
    isLoading = false;
  }
}

  function getShiftIcon(shiftType) {
    switch (shiftType) {
      case '8:00-14:00': return '🌅';
      case '14:00-21:00': return '🌆';
      case '9:30-18:30': return '🌞';
      default: return '📅';
    }
  }

  async function loadExistingReservations() {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/parking/reservations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        // Filter reservations for current space and convert to savedRanges format
        const spaceReservations = result.reservations.filter(
          reservation => reservation.spaceId === `space-${space}` && 
                       reservation.status === 'active'
        );

        savedRanges = spaceReservations.map(reservation => ({
          id: reservation.id,
          startTimestamp: new Date(reservation.startDate).getTime(),
          endTimestamp: new Date(reservation.endDate).getTime(),
          color: getRangeTypeColor(reservation.shiftType),
          name: getRangeTypeName(reservation.shiftType),
          shiftType: reservation.shiftType,
          icon: getShiftIcon(reservation.shiftType)
        }));
      }
    } catch (err) {
      console.error('Error loading reservations:', err);
    }
  }

  function getRangeTypeColor(shiftType) {
    const rangeType = rangeTypes.find(type => type.value === shiftType);
    return rangeType ? rangeType.color : '#666666';
  }

  function getRangeTypeName(shiftType) {
    const rangeType = rangeTypes.find(type => type.value === shiftType);
    return rangeType ? rangeType.name : shiftType;
  }

  function closeModal() {
    showModal = false;
    selectedRangeType = null;
    uploadedFile = null;
    error = null;
    if (fileInput) fileInput.value = '';
  }

  function isToday(day) {
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === today;
  }

  function isPastDate(day) {
    const date = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  function isInSelectedRange(day) {
    if (!selectedStartDate) return false;
    
    const date = new Date(currentYear, currentMonth, day);
    const dateTime = date.getTime();
    const startTime = selectedStartDate.getTime();
    
    if (!selectedEndDate) {
      return dateTime === startTime;
    }
    
    const endTime = selectedEndDate.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  }

  function isRangeStart(day) {
    if (!selectedStartDate) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === selectedStartDate.toDateString();
  }

  function isRangeEnd(day) {
    if (!selectedEndDate) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === selectedEndDate.toDateString();
  }

  function isDateInSavedRanges(day) {
    const date = new Date(currentYear, currentMonth, day);
    const dateTime = date.getTime();
    return savedRanges.some(range => {
      return dateTime >= range.startTimestamp && dateTime <= range.endTimestamp;
    });
  }

  function getRangeColor(day) {
    const date = new Date(currentYear, currentMonth, day);
    const dateTime = date.getTime();
    const range = savedRanges.find(r => 
      dateTime >= r.startTimestamp && dateTime <= r.endTimestamp
    );
    return range ? range.color : null;
  }

  // Initialize calendar and load existing reservations
  onMount(() => {
    updateCalendar();
    loadExistingReservations();
  });
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<Header redirect={true}/>

<div class="app-container">
  <header class="app-header">
    <div class="header-content">
      <h1 class="app-title">Reserve Parking Space</h1>
      <p class="app-subtitle">Select the reservation dates for parking space {space}</p>
    </div>
    <div class="header-accent"></div>
  </header>

  <div class="calendar-container">
    <div class="calendar">
      <div class="calendar-header">
        <button class="nav-button" on:click={prevMonth}>←</button>
        <h2>{new Date(currentYear, currentMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</h2>
        <button class="nav-button" on:click={nextMonth}>→</button>
      </div>

      <div class="calendar-grid">
        {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
          <div class="day-name">{day}</div>
        {/each}

        {#each Array(startingDay).fill(0) as _, i}
          <div class="day empty"></div>
        {/each}

        {#each daysInMonth as day}
          <div 
            class="day 
              {isToday(day) ? 'today' : ''}
              {isPastDate(day) ? 'past' : ''}
              {isInSelectedRange(day) ? 'in-range' : ''}
              {isRangeStart(day) ? 'range-start' : ''}
              {isRangeEnd(day) ? 'range-end' : ''}
              {isDateInSavedRanges(day) ? 'saved-range' : ''}
            "
            style="background-color: {isDateInSavedRanges(day) ? getRangeColor(day) + '30' : ''};
                   border-left: {isRangeStart(day) && isDateInSavedRanges(day) ? '3px solid ' + getRangeColor(day) : ''};
                   border-right: {isRangeEnd(day) && isDateInSavedRanges(day) ? '3px solid ' + getRangeColor(day) : ''};"
            on:click={() => handleDateClick(day)}
          >
            {day}
            {#if isDateInSavedRanges(day)}
              <span class="range-icon">
                {#each savedRanges as range}
                  {#if new Date(currentYear, currentMonth, day).getTime() >= range.startTimestamp && 
                       new Date(currentYear, currentMonth, day).getTime() <= range.endTimestamp}
                    {range.icon}
                  {/if}
                {/each}
              </span>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="range-info">
        {#if selectedStartDate}
          <p>Selected: <span class="highlight">{selectedStartDate.toDateString()}</span>
            {#if selectedEndDate}
              <span> to </span><span class="highlight">{selectedEndDate.toDateString()}</span>
            {/if}
          </p>
        {/if}
      </div>
    </div>
  </div>
</div>

{#if showModal}
  <div class="modal-backdrop" on:click|self={closeModal}>
    <div class="modal">
      <h3>Save Date Range</h3>
      <p class="date-range-display">
        {selectedStartDate.toDateString()} to {selectedEndDate.toDateString()}
      </p>
      
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      
      <div class="range-type-options">
        {#each rangeTypes as type}
          <div 
            class="range-type {selectedRangeType?.id === type.id ? 'selected' : ''}"
            on:click={() => selectedRangeType = type}
            style="--type-color: {type.color}"
          >
            <span class="type-icon">{getShiftIcon(type.value)}</span>
            <span class="type-name">{type.name}</span>
          </div>
        {/each}
      </div>

      {#if selectedStartDate && selectedEndDate && getDaysDifference(selectedStartDate.toISOString().split('T')[0], selectedEndDate.toISOString().split('T')[0]) >= 2}
        <div class="file-upload-section">
          <label for="schedule-document">Schedule Document (PDF) *</label>
          <input 
            bind:this={fileInput}
            type="file" 
            id="schedule-document"
            accept=".pdf"
            on:change={handleFileUpload}
          />
          {#if uploadedFile}
            <div class="uploaded-file">
              <span>📄 {uploadedFile.name}</span>
              <button type="button" on:click={clearFile}>×</button>
            </div>
          {/if}
          <small>Required for reservations longer than 2 days (Max 2MB)</small>
        </div>
      {/if}
      
      <div class="modal-actions">
        <button class="cancel-button" on:click={closeModal} disabled={isLoading}>
          Cancel
        </button>
        <button 
          class="save-button" 
          on:click={makeReservation}
          disabled={!selectedRangeType || isLoading || (getDaysDifference(selectedStartDate.toISOString().split('T')[0], selectedEndDate.toISOString().split('T')[0]) > 2 && !uploadedFile)}
        >
          {isLoading ? 'Reserving...' : 'Reserve'}
        </button>
      </div>
    </div>
  </div>
{/if}


<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f5f9ff;
    color: #2c3e50;
    font-family: "Poppins", sans-serif;
  }

  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  /* Header Styles */
  .app-header {
    background: linear-gradient(135deg, #3a6bc8 0%, #4fc3f7 100%);
    color: white;
    padding: 2rem 0 0;
    border-radius: 0 0 20px 20px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(58, 107, 200, 0.15);
    position: relative;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem 2rem;
  }

  .app-title {
    font-size: 2.2rem;
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .app-subtitle {
    font-size: 1.1rem;
    margin: 0.5rem 0 0;
    font-weight: 400;
    opacity: 0.9;
  }

  .header-accent {
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    margin-top: 1.5rem;
    border-radius: 0 0 20px 20px;
  }

  /* Main Calendar Styles */
  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem 2rem;
    font-family: 'Poppins', sans-serif;
  }

  .calendar-container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(10, 60, 150, 0.1);
    padding: 2rem;
    margin: 0 auto;
    max-width: 800px;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .calendar-header h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .nav-button {
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    background: #e6f0ff;
    border: none;
    border-radius: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    color: #3a6bc8;
    transition: all 0.2s ease;
  }

  .nav-button:hover {
    background: #d0e0ff;
    transform: translateY(-1px);
  }

  .action-button {
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    border: none;
    border-radius: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .today-button {
    background: #3a6bc8;
    color: white;
  }

  .today-button:hover {
    background: #2c5bb7;
    transform: translateY(-1px);
  }

  .ranges-button {
    background: #4fc3f7;
    color: white;
  }

  .ranges-button:hover {
    background: #3ab5ed;
    transform: translateY(-1px);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.75rem;
  }

  .day-name {
    text-align: center;
    font-weight: 600;
    padding: 1rem 0;
    color: #3a6bc8;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .day {
    text-align: center;
    padding: 1rem 0;
    border-radius: 8px;
    min-height: 50px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    background: white;
    border: 1px solid #e0e9ff;
    color: #4a6baf;
  }

  .day:hover {
    background-color: #f0f5ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(58, 107, 200, 0.1);
  }

  .day.empty {
    border: none;
    background: transparent;
    cursor: default;
  }

  .day.today {
    background-color: #e3f2fd;
    color: #1976d2;
    font-weight: 600;
    border: 1px solid #bbdefb;
  }

  .day.in-range {
    background-color: #e1f5fe;
    border-radius: 0;
  }

  .day.range-start {
    background-color: #3a6bc8;
    color: white;
    font-weight: 600;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .day.range-end {
    background-color: #3a6bc8;
    color: white;
    font-weight: 600;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .range-icon {
    font-size: 1.2rem;
    margin-top: 0.2rem;
  }

  .range-info {
    margin-top: 2rem;
    text-align: center;
    font-family: 'Poppins', sans-serif;
    font-size: 1.1rem;
  }

  .highlight {
    color: #3a6bc8;
    font-weight: 600;
    background: #e6f0ff;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(10, 40, 80, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    width: 90%;
    max-width: 450px;
    box-shadow: 0 8px 32px rgba(10, 60, 150, 0.2);
    animation: fadeIn 0.3s ease;
  }

  .ranges-modal {
    max-width: 500px;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal h3 {
    margin-top: 0;
    color: #2c3e50;
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .date-range-display {
    text-align: center;
    font-weight: 500;
    color: #3a6bc8;
    margin: 1rem 0;
    padding: 0.75rem;
    background: #f0f7ff;
    border-radius: 8px;
  }

  /* Range Type Selection */
  .range-type-options {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin: 1.5rem 0;
  }

  .range-type {
    padding: 1rem;
    border: 2px solid #e0e9ff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .range-type:hover {
    border-color: var(--type-color);
    transform: translateY(-2px);
  }

  .range-type.selected {
    border-color: var(--type-color);
    background-color: color-mix(in srgb, var(--type-color) 10%, white);
  }

  .type-icon {
    font-size: 1.5rem;
  }

  .type-name {
    font-weight: 500;
  }

  /* Saved Ranges List */
  .ranges-list {
    margin: 1.5rem 0;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .range-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
    background: white;
    transition: all 0.2s ease;
    border-left: 4px solid var(--item-color);
  }

  .range-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(58, 107, 200, 0.1);
  }

  .range-type-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .range-type-name {
    font-weight: 500;
  }

  .range-dates {
    color: #666;
    font-size: 0.85rem;
    margin: 0.25rem 0 0 2.5rem;
  }

  /* Buttons */
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    background: #f5f5f5;
    color: #666;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background: #e0e0e0;
  }

  .save-button {
    padding: 0.75rem 1.5rem;
    background: #3a6bc8;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .save-button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }

  .save-button:hover:not(:disabled) {
    background: #2c5bb7;
    transform: translateY(-1px);
  }

  .close-button {
    padding: 0.75rem 1.5rem;
    background: #4fc3f7;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: #3ab5ed;
    transform: translateY(-1px);
  }

  .delete-btn {
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    margin-left: 1rem;
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    background: #ff5252;
    transform: scale(1.1);
  }

  .clear-all-btn {
    width: 100%;
    padding: 0.75rem;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 8px;
    margin-top: 1rem;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .clear-all-btn:hover {
    background: #ff5252;
    transform: translateY(-1px);
  }

  .empty-message {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  /* Custom scrollbar */
  .ranges-list::-webkit-scrollbar {
    width: 6px;
  }

  .ranges-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .ranges-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }

  .ranges-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>