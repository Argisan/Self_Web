<?php
// Example PHP code

// Fetching token from the API
fetch('/api/nftoken')
    .then(response => response.json())
    .then(data => {
        // handle data
    })
    .catch(error => {
        // handle error
    });
?>