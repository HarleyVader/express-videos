function startTimer() {

  let seconds = 0;
  let minutes = 0;
  let hours = 0;

  function updateTimer() {
    seconds++;
    if (seconds === 60) {
      seconds = 0;
      minutes++;
      if (minutes === 60) {
        minutes = 0;
        hours++;
      }
    }

    const formattedTime = padNumber(hours) + ':' + padNumber(minutes) + ':' + padNumber(seconds);
    document.getElementById('timer').innerText = formattedTime;
  }

  function padNumber(num) {
    return num < 10 ? '0' + num : num;
  }

  setInterval(updateTimer, 1000); // Update every second
}

// Start the timer when the page loads
startTimer();
