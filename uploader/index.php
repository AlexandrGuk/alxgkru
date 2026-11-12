<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Загрузка картинок — прямая ссылка, превью и BB-код</title>
    <meta name="description" content="Загрузите изображение JPG, PNG или GIF до 5 МБ и получите прямую ссылку, превью нужного размера и BB-код для форума. Без регистрации.">
    <link rel="canonical" href="https://alxgk.site/uploader/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="alxgk.site">
    <meta property="og:title" content="Загрузка картинок — прямая ссылка, превью и BB-код">
    <meta property="og:description" content="Загрузите изображение JPG, PNG или GIF до 5 МБ и получите прямую ссылку, превью нужного размера и BB-код для форума. Без регистрации.">
    <meta property="og:url" content="https://alxgk.site/uploader/">
    <meta property="og:image" content="https://alxgk.site/assets/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" href="../assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/retro.css">
    <link href="index.css" rel="stylesheet">
</head>
<body>
<nav class="nav">
    <a href="../" class="nav-home">alxgk.site</a>
    <a href="../">Главная</a>
</nav>
<div class="uploader parent">
    <h1 class="page-title">Загрузка картинок</h1>
    <p class="lead">JPG, PNG или GIF до 5 МБ. После загрузки получите прямую ссылку, превью нужного размера и BB-код для форума.</p>
    <div class="uploader-container">
        <div class="form-wrapper">
            <form method="post" enctype="multipart/form-data">
                <input type="file" name="files[]" class="file"/>
                <input type="text" name="url" class="filename-url" readonly
                       placeholder="Файл не выбран"/>
                <button class="file-btn btn" onclick="document.querySelector('input.file').click();" type="button">Выбрать файл</button>
                <input type="submit" value="Загрузить" name="submit" class="submit btn btn-primary"/>
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
                <button class="create-preview btn" title="Создать и скопировать ссылку на превью">Создать превью</button>
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
    4. Решение владельцев сайта об удалении размещенных пользователями файлов и изображений не может быть оспорено пользователями. Пользование сайтом alxgk.site является свидетельством безоговорочного принятия условий данных Правил
</div>
</body>
</html>
