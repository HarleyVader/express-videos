  document.addEventListener('DOMContentLoaded', function() {
    var video = document.getElementById('video');
    video.addEventListener('play', function() {
      var folderName = '<%= folderName %>';
      var subfolderName = '<%= subfolderName %>';
      // Ignore favicon.ico and other irrelevant requests
      if (folderName && folderName !== 'favicon.ico') {
        fetch('/incrementViewCount', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderName: folderName, subfolderName: subfolderName })
        })
        .then(response => response.json())
        .then(data => {
          document.getElementById('viewCount').textContent = 'Views: ' + data.newViewCount;
        })
        .catch(error => console.error('Error:', error));
      }
    });
  });