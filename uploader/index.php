<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uploader - alxgk.ru</title>
    <link href="index.css" rel="stylesheet">
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
    </style>
</head>
<body>
<nav class="nav">
    <a href="../index.html" class="nav-home">← alxgk.ru</a>
    <a href="../index.html">Главная</a>
</nav>
<div class="uploader parent">
    <div class="uploader-container">
        <div class="form-wrapper">
            <form method="post" enctype="multipart/form-data">
                <input type="file" name="files[]" class="file"/>
                <input type="text" name="url" class="filename-url" readonly
                       placeholder="Max: 5Mb; Formats: [jpg,jpeg,png,gif]"/>
                <button class="file-btn" onclick="document.querySelector('input.file').click();" type="button">Выбрать файл</button>
                <input type="submit" value="Загрузить" name="submit" class="submit"/>
            </form>
        </div>
        <div class="copy-wrapper">
            <label>Ссылка на изображение:</label>
            <input type="text" name="url" class="input-url" readonly/>
            <div class="copybutton" title="Копировать"></div>
        </div>
        <div class="preview">
            <img id="preview-image" src="none.png">
            <div class="sizing-box-wrapper">
                <button class="create-preview" title="Создать и скопировать ссылку на превью">Создать превью</button>
                <input type="number" class="width" placeholder="Ширина [320]" min="0" max="1920"/>
                <input type="number" class="height" placeholder="Высота [0]" min="0" max="1080"/>
            </div>
            <div class="prev-url-wrapper">
                <label>Превью:</label>
                <input type="text" name="prev-url" class="prev-url" readonly
                       placeholder="Ссылка на превью"/>
                <div class="copybutton" title="Копировать"></div>
            </div>
            <div class="bb-code-url-wrapper">
                <label>BB-code:</label>
                <input type="text" name="bb-url" class="bb-url" readonly
                       placeholder="BB-code"/>
                <div class="copybutton" title="Копировать"></div>
            </div>
        </div>
    </div>
    <script src="upload.js"></script>
</div>
<div class="rules">
    <b>Правила использования:</b>
    1. Запрещается размещение изображений, содержащих пропаганду наркотиков и провоцирующих социальную, расовую, национальную, половую, религиозную и др. ненависть и вражду.<br>
    2. Владельцы ресурса вправе удалить изображение в случае нарушений правил сайта и действующего законодательства. Запрещается размещение файлов и изображений, нарушающих авторское право и соответствующие смежные права.<br>
    3. Владельцы сайта не несут ответственность за содержание изображений и файлов, размещенных пользователями.<br>
    4. Решение владельцев сайта об удалении размещенных пользователями файлов и изображений не может быть оспорено пользователями. Пользование сайтом alxgk.ru является свидетельством безоговорочного принятия условий данных Правил
</div>
</body>
</html>
