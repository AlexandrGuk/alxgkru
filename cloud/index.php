<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$storage_file = 'shared_text.txt';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $text = isset($_POST['text']) ? $_POST['text'] : '';
    $maxSize = ini_get('post_max_size');
    $maxSizeBytes = return_bytes($maxSize);
    
    if (strlen($text) > $maxSizeBytes) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false, 
            'error' => "Текст превышает максимально допустимый размер ($maxSize)"
        ]);
        exit;
    }
    
    file_put_contents($storage_file, $text);
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
    exit;
}

// Функция для конвертации строки размера (например, "8M") в байты
function return_bytes($size_str) {
    switch (substr($size_str, -1)) {
        case 'K':
        case 'k':
            return substr($size_str, 0, -1) * 1024;
        case 'M':
        case 'm':
            return substr($size_str, 0, -1) * 1024 * 1024;
        case 'G':
        case 'g':
            return substr($size_str, 0, -1) * 1024 * 1024 * 1024;
        default:
            return $size_str;
    }
}

if (isset($_GET['action']) && $_GET['action'] === 'get_text') {
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, must-revalidate');
    
    if (file_exists($storage_file)) {
        $current_text = file_get_contents($storage_file);
        if ($current_text === false) {
            error_log("Ошибка чтения файла: " . $storage_file);
            echo json_encode(['error' => 'Ошибка чтения файла']);
            exit;
        }
    } else {
        $current_text = '';
    }
    
    echo json_encode(['text' => $current_text], JSON_UNESCAPED_UNICODE);
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Text Sharing</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(10, 14, 39, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 140, 0, 0.2);
            padding: 12px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .nav a {
            color: #ffffff;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .nav a:hover {
            color: #ff8c00;
        }

        .nav-home {
            font-size: 1.1rem;
        }

        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 70px 20px 20px;
        }
        textarea {
            width: 100%;
            height: 200px;
            margin: 10px 0;
            padding: 10px;
            box-sizing: border-box;
        }
        .button-container {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        #status {
            margin-top: 10px;
            color: #666;
        }
        #display-text {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            min-height: 50px;
            word-break: break-word;
        }
        #display-text a {
            color: #0066cc;
            text-decoration: none;
        }
        #display-text a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="../index.html" class="nav-home">← alxgk.ru</a>
        <a href="../index.html">Главная</a>
    </nav>
    <h1>Text Sharing</h1>
    <div id="limits">Максимальный размер текста: <?php echo ini_get('post_max_size'); ?></div>
    <textarea id="shared_text" placeholder="Введите или вставьте текст здесь..." oninput="updateTextLength()"></textarea>
    <div id="current-length">Длина текста: 0 символов</div>
    <div class="button-container">
        <button onclick="saveText()">Сохранить</button>
        <button onclick="loadText()">Загрузить</button>
        <button onclick="copyText()">Копировать текст</button>
    </div>
    <div id="status"></div>
    <div id="display-text"></div>

    <script>
        function updateTextLength() {
            const textarea = document.getElementById('shared_text');
            const lengthDiv = document.getElementById('current-length');
            lengthDiv.textContent = `Длина текста: ${textarea.value.length} символов`;
        }

        function saveText() {
            const text = document.getElementById('shared_text').value;
            fetch('index.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'text=' + encodeURIComponent(text)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('status').textContent = 'Текст сохранен!';
                    displayText(text);
                }
            })
            .catch(error => {
                document.getElementById('status').textContent = 'Ошибка сохранения: ' + error;
            });
        }

        function loadText() {
            fetch('index.php?action=get_text')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    document.getElementById('status').textContent = 'Ошибка: ' + data.error;
                    return;
                }
                const textarea = document.getElementById('shared_text');
                textarea.value = data.text;
                displayText(data.text);
                document.getElementById('status').textContent = 'Текст загружен';
            })
            .catch(error => {
                document.getElementById('status').textContent = 'Ошибка получения текста: ' + error;
                console.error('Error:', error);
            });
        }

        function copyText() {
            const textarea = document.getElementById('shared_text');
            textarea.select();
            try {
                document.execCommand('copy');
                document.getElementById('status').textContent = 'Текст скопирован в буфер обмена';
            } catch (err) {
                document.getElementById('status').textContent = 'Ошибка копирования: ' + err;
            }
        }

        function displayText(text) {
            const displayDiv = document.getElementById('display-text');
            // Регулярное выражение для поиска URL
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            // Заменяем URL на кликабельные ссылки
            const htmlText = text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
            displayDiv.innerHTML = htmlText;
        }

        // Загружаем текст при открытии страницы
        loadText();
    </script>
</body>
</html>