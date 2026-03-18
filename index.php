<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NFToken Checker</title>
    <style>
        body {
            background: linear-gradient(to right, #8e44ad, #2c3e50);
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: rgba(0, 0, 0, 0.5);
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 5px;
            background: #2c3e50;
            color: #fff;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        }
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            flex: 1;
            padding: 12px 20px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #2980b9;
        }
        #progress-bar {
            width: 100%;
            background-color: #555;
            border-radius: 5px;
            margin-top: 20px;
            overflow: hidden;
            height: 25px;
            display: none;
        }
        #progress-bar span {
            display: flex;
            height: 100%;
            background-color: #2ecc71;
            width: 0;
            border-radius: 5px;
            transition: width 0.3s ease;
        }
        #results {
            margin-top: 20px;
            padding: 15px;
            background: rgba(46, 204, 113, 0.1);
            border: 1px solid #2ecc71;
            border-radius: 5px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 NFToken Checker</h1>
        <div class="form-group">
            <label for="licenseKey">License Key:</label>
            <input type="text" id="licenseKey" placeholder="Enter your license key" />
        </div>
        <div class="form-group">
            <label for="cookie">Netflix Cookie:</label>
            <textarea id="cookie" placeholder="Paste your Netflix cookie here"></textarea>
        </div>
        <div id="progress-bar"><span></span></div>
        <div class="button-group">
            <button id="checkButton">▶️ Check NFTokens</button>
            <button id="clearButton">🗑️ Clear</button>
        </div>
        <div id="results"></div>
    </div>
    <script>
        const checkButton = document.getElementById('checkButton');
        const clearButton = document.getElementById('clearButton');
        const licenseKeyInput = document.getElementById('licenseKey');
        const cookieInput = document.getElementById('cookie');
        const progressBar = document.getElementById('progress-bar');
        const resultsDiv = document.getElementById('results');

        checkButton.addEventListener('click', async () => {
            const licenseKey = licenseKeyInput.value.trim();
            const cookie = cookieInput.value.trim();
            
            if (!licenseKey || !cookie) {
                resultsDiv.innerHTML = '❌ Please enter both License Key and Cookie';
                resultsDiv.style.display = 'block';
                return;
            }

            sessionStorage.setItem('licenseKey', licenseKey);
            progressBar.style.display = 'block';
            resultsDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/nftoken', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ licenseKey, cookie })
                });
                
                const data = await response.json();
                progressBar.style.display = 'none';
                
                if (response.ok) {
                    resultsDiv.innerHTML = '<strong>✅ Success!</strong><br/>' + JSON.stringify(data, null, 2);
                } else {
                    resultsDiv.innerHTML = '❌ Error: ' + (data.message || 'Failed');
                }
                resultsDiv.style.display = 'block';
            } catch (error) {
                progressBar.style.display = 'none';
                resultsDiv.innerHTML = '❌ Error: ' + error.message;
                resultsDiv.style.display = 'block';
            }
        });

        clearButton.addEventListener('click', () => {
            cookieInput.value = '';
            resultsDiv.style.display = 'none';
        });

        window.onload = () => {
            const saved = sessionStorage.getItem('licenseKey');
            if (saved) licenseKeyInput.value = saved;
        };
    </script>
</body>
</html>
