<script>
  import { goto } from '$app/navigation';
  import Header from '$lib/components/Header.svelte';
  import { theme } from '$lib/stores/theme';
  
  let selectedDate = '';
  let selectedSpace;
  let selectedShift = 'first';

  function reserve() {
    goto(`/reserve?space=${selectedSpace}`);
  }
</script>
  <Header />
<div class="hero-container" class:dark={$theme === 'dark'}>
  <div class="scalable-wrapper">
    <img
      src="/empty-parking-lot.png"
      alt="Empty parking lot"
      class="scalable-image"
      loading="eager"
    />
    <div class="controls-panel" class:dark={$theme === 'dark'}>
      <div class="date-picker">
        <input 
          type="date" 
          bind:value={selectedDate}
          class="date-input"
        />
      </div>
      <div class="shift-selector">
        <select bind:value={selectedShift}>
          <option value="first">Morning shift (8:00-14:00)</option>
          <option value="second">Evening shift (14:00-21:00)</option>
          <option value="full">All day shift (9:30-18:30)</option>
        </select>
      </div>
      <input 
          type="text" 
          bind:value={selectedSpace}
          class=""
        />
      <button on:click={reserve}>reserve</button>
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
    height: 100vh;
    
    display: flex;
    flex-direction: column; /* Добавено */
    justify-content: flex-start; /* Променено */
    align-items: center;
    background: #f5f9ff;
    overflow: hidden;
    transition: background 0.3s ease;

  }

  .scalable-wrapper {
    position: relative;
    width: 75vmin;
    height: auto;
    margin: 0 auto;
    z-index: 1; /* Добавено */
    margin-top: 20px; /* Добавено */
  }


  .hero-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f5f9ff;
    overflow: hidden;
    position: relative;
    transition: background 0.3s ease;
  }

  .hero-container.dark {
    background: #0a192f;
  }

  .scalable-wrapper {
    position: relative;
    width: 75vmin;
    height: auto;
    margin: 0 auto;
  }

  .controls-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: #f5f9ff;
    transition: background 0.3s ease;
  }

  .controls-panel.dark {
      background: #0a192f;
    }

  .date-picker {
    flex: 1;
    margin-right: 1rem;
  }

  .date-input {
    padding: 0.5rem;
    border-radius: 0.3rem;
    border: 1px solid #ccc;
    background: white;
    font-size: 0.9rem;
    width: 100%;
  }

  .shift-selector select {
    padding: 0.5rem;
    border-radius: 0.3rem;
    border: 1px solid #ccc;
    background: white;
    font-size: 0.9rem;
  }

  .scalable-image {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 0.8vmin;
    box-shadow: 0 0.8vmin 2vmin rgba(0,0,0,0.15);
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

  .perfect-column {
    position: absolute;
    left: 15%;
    width: 30%;
    height: 100%;
  }

  .right-column {
    position: absolute;
    left: 55%;
    width: 30%;
    height: 100%;
  }

  .button-column {
    display: flex;
    flex-direction: column;
    height: 80%;
    gap: 0;
    justify-content: flex-end; /* Промяна - бутоните се подреждат от долу нагоре */
  }

  .scalable-button {
    margin: 0;
    width: 100%;
    height: 10%;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.1s ease;
    opacity: 0.1;
    padding: 0;
    position: relative;

  }


  .scalable-button:hover {
    opacity: 0.3;
    background: rgb(0, 0, 0);
  }


  /* Коригираме за мобилни устройства */
  @media (max-width: 768px) {
    .scalable-button {
      height: 10%; /* Еднаква височина и за мобилни */
    }
  }

  @media (max-width: 480px) {
    .scalable-button {
      height: 10%; /* Еднаква височина и за малки екрани */
    }
  }
  /* Мобилна версия */
  @media (max-width: 768px) {
    .scalable-wrapper {
      width: 90vmin;
    }
    
    .controls-panel {
      flex-direction: column;
    }
    
    .date-picker {
      margin-right: 0;
      margin-bottom: 0.5rem;
      width: 100%;
    }
    
    .shift-selector {
      width: 100%;
    }
    
    .shift-selector select {
      width: 100%;
    }
    
    .scalable-buttons {
      width: 55%;
      height: 70%;
    }
    
    .button-columns {
      width: 80%;
    }
    
    .perfect-column {
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
  }

  /* Версия за много малки екрани */
  @media (max-width: 480px) {
    .scalable-wrapper {
      width: 100vmin;
    }
    
    .button-columns {
      width: 70%;
      height: 84%;
    }
    
    .perfect-column {
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
  }
</style>