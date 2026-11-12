<?php

$storage_file = __DIR__ . '/shared_text.txt';

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
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Общий текст — alxgk.site</title>
    <meta name="robots" content="noindex">
    <link rel="icon" type="image/png" href="../assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/retro.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .lead {
            margin: 12px 0 36px;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        .editor {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 24px;
            background-color: var(--window);
            background-image: var(--window-bg);
            box-shadow: var(--window-frame);
        }

        .meta {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 4px 16px;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        textarea {
            width: 100%;
            height: 240px;
            padding: 12px;
            background: var(--field);
            border: 2px solid var(--ink);
            color: var(--text-primary);
            font: 0.95rem/1.5 var(--font-code);
            resize: vertical;
            outline: none;
        }

        textarea:focus {
            border-color: var(--accent-orange);
            box-shadow: 0 0 12px rgba(255, 140, 0, 0.35);
        }

        .button-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        #status {
            min-height: 1.4em;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        #display-text {
            min-height: 50px;
            margin-top: 12px;
            padding: 16px;
            background: var(--field);
            border: 2px solid var(--ink);
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
        }

        #display-text a {
            color: var(--accent-orange);
        }

        @media (max-width: 720px) {
            .editor {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="../" class="nav-home">alxgk.site</a>
        <a href="../">Главная</a>
    </nav>
    <main class="page">
        <h1 class="page-title">Общий текст</h1>
        <p class="lead">Сохраните текст на одном устройстве и загрузите на другом. Текст один на всех и виден каждому, кто откроет страницу.</p>
        <div class="editor window-open">
            <textarea id="shared_text" placeholder="Введите или вставьте текст здесь..." oninput="updateTextLength()"></textarea>
            <div class="meta">
                <span id="current-length">Длина текста: 0 символов</span>
                <span id="limits">Максимальный размер текста: <?php echo ini_get('post_max_size'); ?></span>
            </div>
            <div class="button-container">
                <button class="btn btn-primary" onclick="saveText()">Сохранить</button>
                <button class="btn" onclick="loadText()">Загрузить</button>
                <button class="btn" onclick="copyText()">Копировать текст</button>
            </div>
            <div id="status" role="status"></div>
            <div id="display-text"></div>
        </div>
    </main>

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
                updateTextLength();
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
            const fragment = document.createDocumentFragment();
            // split() with a capture group puts URLs at odd indexes
            text.split(/(https?:\/\/[^\s]+)/g).forEach((part, index) => {
                if (index % 2 === 0) {
                    fragment.append(part);
                    return;
                }
                const link = document.createElement('a');
                link.href = part;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = part;
                fragment.append(link);
            });
            displayDiv.replaceChildren(fragment);
        }

        // Загружаем текст при открытии страницы
        loadText();
    </script>
</body>
</html>